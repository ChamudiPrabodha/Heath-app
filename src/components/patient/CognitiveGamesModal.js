// src/components/patient/CognitiveGamesModal.js - Brain Fitness & Memory Match Game
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const CARD_ICONS = ['heart', 'leaf', 'star', 'sun', 'apple-alt', 'bell'];

function createShuffledDeck() {
  const deck = [];
  CARD_ICONS.forEach((icon, index) => {
    deck.push({ id: `${index}-a`, icon, isFlipped: false, isMatched: false });
    deck.push({ id: `${index}-b`, icon, isFlipped: false, isMatched: false });
  });
  return deck.sort(() => Math.random() - 0.5);
}

export default function CognitiveGamesModal({ visible, onClose }) {
  const [cards, setCards] = useState(createShuffledDeck());
  const [selectedCards, setSelectedCards] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isWon, setIsWon] = useState(false);

  const resetGame = () => {
    setCards(createShuffledDeck());
    setSelectedCards([]);
    setMoves(0);
    setMatches(0);
    setIsWon(false);
  };

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetGame();
    }
  }, [visible]);

  const handleCardPress = (index) => {
    if (selectedCards.length === 2) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched) return;

    const newCards = [...cards];
    newCards[index] = { ...card, isFlipped: true };
    setCards(newCards);

    const newSelected = [...selectedCards, { card, index }];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newSelected;
      if (first.card.icon === second.card.icon) {
        // Matched!
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === first.index || i === second.index
                ? { ...c, isMatched: true }
                : c
            )
          );
          setMatches((m) => {
            const nextMatches = m + 1;
            if (nextMatches === CARD_ICONS.length) {
              setIsWon(true);
            }
            return nextMatches;
          });
          setSelectedCards([]);
        }, 500);
      } else {
        // Not matched, flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === first.index || i === second.index
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setSelectedCards([]);
        }, 900);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="brain" size={24} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.title}>Cognitive Activities</Text>
                <Text style={styles.subtitle}>Memory match brain exercise</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.gameStatsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>MOVES</Text>
              <Text style={styles.statPillValue}>{moves}</Text>
            </View>
            <View style={styles.statPill}>
              <Text style={styles.statPillLabel}>PAIRS FOUND</Text>
              <Text style={styles.statPillValue}>
                {matches} / {CARD_ICONS.length}
              </Text>
            </View>
            <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
              <Ionicons name="refresh" size={16} color="#6B7280" />
              <Text style={styles.resetBtnText}>Restart</Text>
            </TouchableOpacity>
          </View>

          {/* Win Banner */}
          {isWon && (
            <View style={styles.winBanner}>
              <Ionicons name="trophy" size={24} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.winTitle}>🎉 Brilliant Job!</Text>
                <Text style={styles.winSub}>
                  You completed the memory puzzle in {moves} moves!
                </Text>
              </View>
            </View>
          )}

          {/* Memory Match Cards Grid */}
          <ScrollView contentContainerStyle={styles.gridContainer}>
            <View style={styles.grid}>
              {cards.map((card, idx) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardTile,
                    card.isFlipped && styles.cardTileFlipped,
                    card.isMatched && styles.cardTileMatched,
                  ]}
                  onPress={() => handleCardPress(idx)}
                  activeOpacity={0.8}
                >
                  {card.isFlipped || card.isMatched ? (
                    <FontAwesome5
                      name={card.icon}
                      size={24}
                      color={card.isMatched ? '#10B981' : '#4F46E5'}
                    />
                  ) : (
                    <MaterialCommunityIcons name="help" size={24} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close Brain Games</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  gameStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  statPill: {
    alignItems: 'center',
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  winBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  winTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  winSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 1,
  },
  gridContainer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 340,
  },
  cardTile: {
    width: 68,
    height: 72,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTileFlipped: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  cardTileMatched: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  doneBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
