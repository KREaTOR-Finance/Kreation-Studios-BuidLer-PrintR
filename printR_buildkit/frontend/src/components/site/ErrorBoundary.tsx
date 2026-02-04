import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  constructor(props: any){
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(err: any){
    return { hasError: true, message: String(err?.message ?? err) };
  }
  componentDidCatch(err: any){
    console.error("UI error boundary:", err);
  }
  render(){
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="container">
        <div className="panel">
          <div style={{ fontWeight: 1000 }}>Something went wrong</div>
          <div className="small" style={{ marginTop: 6 }}>Refresh the page. If the issue persists, contact support.</div>
          <div className="small" style={{ marginTop: 10, opacity: 0.8 }}>{this.state.message}</div>
        </div>
      </div>
    );
  }
}
