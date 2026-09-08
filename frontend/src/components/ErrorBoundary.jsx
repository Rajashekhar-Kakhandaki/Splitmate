import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in application:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#121212] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-[#1a1a1a] border border-ink/10 dark:border-white/10 rounded-[2rem] p-8 shadow-2xl">
            <div className="w-16 h-16 bg-owe/10 text-owe rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              ⚠️
            </div>
            <h2 className="font-display text-2xl text-ink dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-ink/60 dark:text-white/60 mb-6 leading-relaxed">
              An unexpected display error occurred. You can reload the page to restore your app.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full bg-cover text-paper rounded-[1rem] py-3.5 text-sm font-medium hover:bg-cover-light transition-all shadow-md"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
