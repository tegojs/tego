import { ErrorBoundary } from 'react-error-boundary';

import { ErrorFallback } from '../../error-fallback';
import { PageContent } from './PageContent';

export const PageContentComponent = (props) => {
  const handleErrors = (error) => {
    window?.Sentry?.captureException(error);
    console.error(error);
  };

  return (
    <div className="tb-page-wrapper">
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleErrors}>
        <PageContent {...props} />
      </ErrorBoundary>
    </div>
  );
};
