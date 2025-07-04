import { ReactNode, useMemo } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Helmet } from 'react-helmet';
import {
  Breadcrumb, Container, MenuItem, SelectMenu,
} from '@openedx/paragon';
import { Link } from 'react-router-dom';
import { useLibraryContext } from '../common/context/LibraryContext';
import { useSidebarContext } from '../common/context/SidebarContext';
import { useContentFromSearchIndex, useContentLibrary } from '../data/apiHooks';
import Loading from '../../generic/Loading';
import NotFoundAlert from '../../generic/NotFoundAlert';
import ErrorAlert from '../../generic/alert-error';
import { ContainerType } from '../../generic/key-utils';
import Header from '../../header';
import SubHeader from '../../generic/sub-header/SubHeader';
import { SubHeaderTitle } from '../LibraryAuthoringPage';
import { messages, subsectionMessages } from './messages';
import { LibrarySidebar } from '../library-sidebar';
import { LibraryContainerChildren } from './LibraryContainerChildren';
import { ContainerEditableTitle, FooterActions, HeaderActions } from '../containers';
import { ContainerHit } from '../../search-manager';

interface OverflowLinksProps {
  to: string | string[];
  children: ReactNode | ReactNode[];
}

const OverflowLinks = ({ children, to }: OverflowLinksProps) => {
  if (typeof to === 'string') {
    return (
      <Link className="subsection-breadcrumb link-muted" to={to}>
        {children}
      </Link>
    );
  }
  // to is string[] that should be converted to overflow menu
  const items = to?.map((link, index) => (
    <MenuItem key={link} to={link} as={Link}>
      {children?.[index]}
    </MenuItem>
  ));
  return (
    <SelectMenu
      className="breadcrumb-menu"
      variant="link"
      defaultMessage={`${items.length} Sections`}
    >
      {items}
    </SelectMenu>
  );
};

/** Full library subsection page */
export const LibrarySubsectionPage = () => {
  const intl = useIntl();
  const { libraryId, containerId } = useLibraryContext();
  const { sidebarItemInfo } = useSidebarContext();

  const { data: libraryData, isLoading: isLibLoading } = useContentLibrary(libraryId);
  // fetch subsectionData from index as it includes its parent sections as well.
  const {
    hits, isLoading, isError, error,
  } = useContentFromSearchIndex(containerId ? [containerId] : []);
  const subsectionData = (hits as ContainerHit[])?.[0];

  const breadcrumbs = useMemo(() => {
    const links: Array<{ label: string | string[], to: string | string[] }> = [
      {
        label: libraryData?.title || '',
        to: `/library/${libraryId}`,
      },
    ];
    const sectionLength = subsectionData?.sections?.displayName?.length || 0;
    if (sectionLength === 1) {
      links.push({
        label: subsectionData.sections?.displayName?.[0] || '',
        to: `/library/${libraryId}/section/${subsectionData?.sections?.key?.[0]}`,
      });
    } else if (sectionLength > 1) {
      // Add all sections as a single object containing list of links
      // This is converted to overflow menu by OverflowLinks component
      links.push({
        label: subsectionData?.sections?.displayName || '',
        to: subsectionData?.sections?.key?.map((link) => `/library/${libraryId}/section/${link}`) || '',
      });
    } else {
      // Adding empty breadcrumb to add the last `>` spacer.
      links.push({
        label: '',
        to: '',
      });
    }
    return (
      <Breadcrumb
        ariaLabel={intl.formatMessage(messages.breadcrumbsAriaLabel)}
        links={links}
        linkAs={OverflowLinks}
      />
    );
  }, [libraryData, subsectionData, libraryId]);

  if (!containerId || !libraryId) {
    // istanbul ignore next - This shouldn't be possible; it's just here to satisfy the type checker.
    throw new Error('Rendered without containerId or libraryId URL parameter');
  }

  // Only show loading if section or library data is not fetched from index yet
  if (isLibLoading || isLoading) {
    return <Loading />;
  }

  if (!libraryData || !subsectionData) {
    return <NotFoundAlert />;
  }

  // istanbul ignore if
  if (isError) {
    return <ErrorAlert error={error} />;
  }

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <Helmet>
          <title>
            {libraryData.title} | {subsectionData.displayName} | {process.env.SITE_NAME}
          </title>
        </Helmet>
        <Header
          number={libraryData.slug}
          title={libraryData.title}
          org={libraryData.org}
          contextId={libraryData.id}
          isLibrary
          containerProps={{
            size: undefined,
          }}
        />
        <Container className="px-0 mt-4 mb-5 library-authoring-page bg-white">
          <div className="px-4 bg-light-200 border-bottom mb-2">
            <SubHeader
              title={<SubHeaderTitle title={<ContainerEditableTitle containerId={containerId} />} />}
              breadcrumbs={breadcrumbs}
              headerActions={(
                <HeaderActions
                  containerKey={containerId}
                  infoBtnText={intl.formatMessage(subsectionMessages.infoButtonText)}
                  addContentBtnText={intl.formatMessage(subsectionMessages.newContentButton)}
                />
              )}
              hideBorder
            />
          </div>
          <Container className="px-4 py-4">
            <LibraryContainerChildren containerKey={containerId} />
            <FooterActions
              addContentType={ContainerType.Unit}
              addContentBtnText={intl.formatMessage(subsectionMessages.addContentButton)}
              addExistingContentBtnText={intl.formatMessage(subsectionMessages.addExistingContentButton)}
            />
          </Container>
        </Container>
      </div>
      {!!sidebarItemInfo?.type && (
        <div
          className="library-authoring-sidebar box-shadow-left-1 bg-white"
          data-testid="library-sidebar"
        >
          <LibrarySidebar />
        </div>
      )}
    </div>
  );
};
