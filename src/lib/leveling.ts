export const getReputationForLevel = (level: number) => level * level * 500;

export const getLevelForReputation = (reputation: number) => {
  return Math.floor(Math.sqrt(reputation / 500)) + 1;
};

export const getProgressToNextLevel = (reputation: number, currentLevel: number) => {
  const currentLevelRep = getReputationForLevel(currentLevel);
  const nextLevelRep = getReputationForLevel(currentLevel + 1);
  
  const progress = (reputation - currentLevelRep) / (nextLevelRep - currentLevelRep);
  return Math.min(Math.max(progress * 100, 0), 100);
};
