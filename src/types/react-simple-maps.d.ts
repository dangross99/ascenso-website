declare module "react-simple-maps" {
  import { FC } from "react";
  export const ComposableMap: FC<{
    projectionConfig?: { scale?: number };
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }>;
  export const Geographies: FC<{
    geography: string;
    children: (props: { geographies: Array<{ rsmKey: string; id: string; [k: string]: unknown }> }) => React.ReactNode;
  }>;
  export const Geography: FC<{
    geography: { rsmKey: string; id: string; [k: string]: unknown };
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    style?: Record<string, React.CSSProperties>;
  }>;
  export const ZoomableGroup: FC<{
    center?: [number, number];
    zoom?: number;
    disablePanning?: boolean;
    filterZoomEvent?: (ev: { type: string }) => boolean;
    children?: React.ReactNode;
  }>;
}
