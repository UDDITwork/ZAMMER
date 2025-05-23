import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, send error to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
      console.error('Production Error Logged:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Development error display
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 rounded-full p-2 mr-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-red-600">Development Error</h1>
              </div>
              
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Error Message:</h2>
                <p className="text-red-600 font-mono text-sm bg-red-50 p-3 rounded border">
                  {this.state.error && this.state.error.toString()}
                </p>
              </div>

              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Component Stack:</h2>
                <pre className="text-sm bg-gray-50 p-3 rounded border overflow-auto max-h-40">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </div>

              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Error Stack:</h2>
                <pre className="text-sm bg-gray-50 p-3 rounded border overflow-auto max-h-40">
                  {this.state.error && this.state.error.stack}
                </pre>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Reload Page
                </button>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Retry Count:</strong> {this.state.retryCount}</p>
                <p><strong>URL:</strong> {window.location.href}</p>
                <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      }

      // Production error display (user-friendly)
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
            <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/user/dashboard'}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md transition-colors"
              >
                Go to Home
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-500">
              <p>Error ID: {Date.now()}</p>
              {this.state.retryCount > 0 && (
                <p>Retry attempts: {this.state.retryCount}</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 