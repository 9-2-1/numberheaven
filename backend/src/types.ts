export interface NumberRecord {
  name: string;
  color: string;
  order: string;
  value: number;
  last: number;
}

export interface HistoryRecord {
  time: number;
  name: string;
  value: number;
}

export interface NumberWithHistory extends NumberRecord {
  history: HistoryRecord[];
}
