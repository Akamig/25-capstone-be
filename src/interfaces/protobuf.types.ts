export interface MeshPacket {
  from: number;
  to: number;
  channel: number;
  decoded?: Data;
  encrypted?: Buffer;
  id: number;
  rx_time: number;
  rx_snr: number;
  hop_limit: number;
  want_ack: boolean;
  priority: number;
  rx_rssi: number;
  via_mqtt: boolean;
  hop_start: number;
  public_key?: Buffer;
  pki_encrypted: boolean;
}

export interface Data {
  portnum: number;
  payload: Buffer;
  want_response: boolean;
  dest: number;
  source: number;
  request_id: number;
  reply_id: number;
  emoji: number;
}

export interface SeatStatus {
  isOccupied?: boolean;
}

export interface DeviceMetrics {
  battery_level?: number;
  voltage?: number;
  channel_utilization?: number;
  air_util_tx?: number;
  uptime_seconds?: number;
}
