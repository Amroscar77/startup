import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Map as MapIcon } from 'lucide-react';
import useSupercluster from 'use-supercluster';
import { PriceSubmission } from '../../lib/MarketService';
import { cn } from '../../lib/utils';

interface MapContainerProps {
  submissions: PriceSubmission[];
  center: { lat: number; lng: number };
  onMarkerClick?: (submission: PriceSubmission) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const options = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
  ],
};

export default function MapContainer({ submissions, center, onMarkerClick }: MapContainerProps) {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(13);
  const [bounds, setBounds] = useState<any>(null);
  const [selected, setSelected] = useState<PriceSubmission | null>(null);

  if (!apiKey) {
    return (
      <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <MapIcon size={32} />
        </div>
        <h3 className="font-headline text-xl font-black text-on-surface mb-2">Google Maps API Key Missing</h3>
        <p className="text-on-surface-variant text-sm max-w-xs">
          Please set the <code className="bg-surface-container-highest px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in your environment variables.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <MapIcon size={32} />
        </div>
        <h3 className="font-headline text-xl font-black text-on-surface mb-2">Map Load Error</h3>
        <p className="text-on-surface-variant text-sm max-w-xs">
          {loadError.message || "Check your API key and ensure 'Maps JavaScript API' is enabled in Google Cloud Console."}
        </p>
      </div>
    );
  }

  const points = useMemo(() => submissions.map(s => ({
    type: 'Feature' as const,
    properties: { cluster: false, submission: s, id: s.id },
    geometry: {
      type: 'Point' as const,
      coordinates: [s.location.lng, s.location.lat],
    },
  })), [submissions]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom,
    options: { radius: 75, maxZoom: 20 },
  });

  if (!isLoaded) return <div className="w-full h-full bg-surface-container flex items-center justify-center font-headline font-black text-primary animate-pulse">LOADING MAP...</div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      options={options}
      onLoad={m => setMap(m)}
      onZoomChanged={() => map && setZoom(map.getZoom()!)}
      onBoundsChanged={() => {
        if (map) {
          const b = map.getBounds();
          if (b) {
            setBounds([
              b.getSouthWest().lng(),
              b.getSouthWest().lat(),
              b.getNorthEast().lng(),
              b.getNorthEast().lat(),
            ]);
          }
        }
      }}
      onClick={() => setSelected(null)}
    >
      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={{ lat: latitude, lng: longitude }}
              icon={{
                url: `data:image/svg+xml;base64,${btoa(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="#F27D26" stroke="white" stroke-width="2" />
                    <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="sans-serif" font-weight="bold" font-size="12">${pointCount}</text>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(40, 40),
              }}
              onClick={() => {
                const expansionZoom = Math.min(
                  supercluster.getClusterExpansionZoom(cluster.id),
                  20
                );
                map?.setZoom(expansionZoom);
                map?.panTo({ lat: latitude, lng: longitude });
              }}
            />
          );
        }

        const submission = cluster.properties.submission;
        return (
          <Marker
            key={`marker-${submission.id}`}
            position={{ lat: latitude, lng: longitude }}
            icon={{
              url: `data:image/svg+xml;base64,${btoa(`
                <svg width="60" height="30" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="60" height="24" rx="12" fill="#F27D26" />
                  <path d="M30 30 L25 24 L35 24 Z" fill="#F27D26" />
                  <text x="50%" y="16" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="900" font-size="10">${submission.price} ${submission.currency}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(60, 30),
            }}
            onClick={() => {
              setSelected(submission);
              onMarkerClick?.(submission);
            }}
          />
        );
      })}

      {selected && (
        <InfoWindow
          position={{ lat: selected.location.lat, lng: selected.location.lng }}
          onCloseClick={() => setSelected(null)}
        >
          <div className="p-2 min-w-[150px]">
            <p className="font-bold text-on-surface text-sm">{selected.itemName}</p>
            <p className="text-primary font-black text-lg">{selected.price} {selected.currency}</p>
            <p className="text-[10px] text-outline font-bold uppercase">{selected.storeName}</p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
