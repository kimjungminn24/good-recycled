export type StageArt = 'wasteTire' | 'powder' | 'bollard' | 'tactileBlock' | 'planter' | 'playground' | 'retreadTire' | 'roadBarrier';

export type Stage = {
  art: StageArt;
  name: string;
  label: string;
  code?: string;
  seen: string;
  r: number;
  hitW: number;
  hitH: number;
  hitRound: number;
  fill: string;
};

export const STAGES: Stage[] = [
  { art: 'wasteTire', name: '폐타이어', label: '폐타이어', seen: '다 닳은 타이어', r: 15, hitW: 1.14, hitH: .87, hitRound: .42, fill: '#2a2a2d' },
  { art: 'powder', name: '재활용 타이어 분말', label: '타이어 분말', code: 'GR M 6021', seen: '폐타이어를 간 알갱이', r: 20, hitW: .94, hitH: .66, hitRound: .4, fill: '#8a6a52' },
  { art: 'bollard', name: '재활용 고무 차선규제봉', label: '차선규제봉', code: 'GR M 6022', seen: '도로 위 주황색 기둥', r: 26, hitW: .47, hitH: .9, hitRound: .32, fill: '#ff6a2b' },
  { art: 'tactileBlock', name: '재활용 고무 시각 장애인용 점자블록', label: '점자블록', code: 'GR M 6016', seen: '지하철역 바닥의 노란 블록', r: 33, hitW: .92, hitH: .76, hitRound: .12, fill: '#ffcc1a' },
  { art: 'planter', name: '재활용 고무 가로화분', label: '가로화분', code: 'GR M 6019', seen: '길가의 큰 화분', r: 41, hitW: .88, hitH: .82, hitRound: .35, fill: '#4caf62' },
  { art: 'playground', name: '재활용 고무 어린이 놀이터용 바닥재', label: '놀이터 바닥재', code: 'GR M 6004', seen: '놀이터 바닥, 폐고무 50% 이상', r: 60, hitW: .97, hitH: .72, hitRound: .12, fill: '#3f8cd8' },
  { art: 'roadBarrier', name: '재활용 고무 도로안전분리대', label: '도로안전분리대', code: 'GR M 6012', seen: '도로 위 주황색 안전 분리대', r: 72, hitW: .98, hitH: .86, hitRound: .2, fill: '#f05a2a' },
  { art: 'retreadTire', name: '재활용 트레드 타이어', label: '트레드 타이어', code: 'GR M 6001', seen: '닳은 타이어에 새 접지면', r: 82, hitW: .87, hitH: .67, hitRound: .42, fill: '#1e1e21' },
];

export const LAST = STAGES.length - 1;

const DROP_WEIGHTS = [5, 3, 2];

export function rollStage(): number {
  const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
  let n = Math.random() * total;
  for (let i = 0; i < DROP_WEIGHTS.length; i++) {
    n -= DROP_WEIGHTS[i];
    if (n < 0) return i;
  }
  return 0;
}

export function points(stage: number): number {
  return 2 ** stage;
}

export function collisionSize(stage: number): { width: number; height: number; radius: number } {
  const item = STAGES[stage];
  const width = item.r * 2 * item.hitW;
  const height = item.r * 2 * item.hitH;
  return { width, height, radius: Math.min(width, height) * item.hitRound };
}
