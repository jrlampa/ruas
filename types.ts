export interface GeoLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface OsmNode {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OsmWay {
  type: 'way';
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

export interface OsmMember {
  type: string;
  ref: number;
  role: string;
  geometry?: { lat: number; lon: number }[];
}

export interface OsmRelation {
  type: 'relation';
  id: number;
  members: OsmMember[];
  tags?: Record<string, string>;
}

export type OsmElement = OsmNode | OsmWay | OsmRelation;

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OsmElement[];
}

export interface DxfOptions {
  radius: number;
  center: GeoLocation;
  includeBuildings: boolean;
  includeRoads: boolean;
  includeNature: boolean;
  includeDetails: boolean; // street furniture, lights, etc
}

export interface AnalysisStats {
  totalBuildings: number;
  totalRoads: number;
  totalNature: number;
  avgHeight: number;
  maxHeight: number;
}

export interface TerrainPoint {
  lat: number;
  lng: number;
  elevation: number;
}

export type TerrainGrid = TerrainPoint[][];

export interface AppSettings {
  enableAI: boolean;
  simplifyGeometry: boolean;
}

export interface GlobalState {
  center: GeoLocation;
  radius: number;
  settings: AppSettings;
}