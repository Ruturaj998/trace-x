import { Component } from "react";

/**
 * Defensive Error Boundary for Leaflet Map Components.
 * Ensures an unexpected map rendering error or coordinate glitch can NEVER
 * crash the React component tree or cause a black screen.
 */
export default class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Map rendering error intercepted by MapErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="real-map-empty">
          <div className="real-map-empty-inner">
            <span className="radar-sweep-icon" />
            <strong>MAP TELEMETRY PAUSED</strong>
            <p>
              Awaiting telemetry synchronization. Coordinate stream will resume automatically when valid fixes are detected.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
