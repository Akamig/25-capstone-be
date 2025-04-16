export interface SeatPosition {
  seatId: string;
  x: number;
  y: number;
}

export interface SeatLayout {
  name: string;
  seat: SeatPosition[];
}

export interface SeatMetadata {
  id: string;
  name: string;
  layouts: {
    [layoutName: string]: SeatLayout;
  };
  currentLayout: string;
}
