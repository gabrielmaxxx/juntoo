import { useRef, useCallback, CSSProperties, memo, useEffect, useState } from 'react';
import { List, ListImperativeAPI, RowComponentProps } from 'react-window';
import { EventCard } from '@/components/EventCard';
import { Event } from '@/types';
import { Loader2 } from 'lucide-react';

interface VirtualizedEventListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  itemSize?: number;
}

interface RowProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

// Row component for react-window v2
const Row = memo(({ index, style, events, onEventClick, hasNextPage, isFetchingNextPage }: {
  index: number;
  style: CSSProperties;
  events: Event[];
  onEventClick: (event: Event) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}) => {
  const event = events[index];

  // Loading row at the end
  if (index === events.length) {
    return (
      <div style={style} className="flex items-center justify-center py-4">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando mais eventos...</span>
          </div>
        ) : hasNextPage ? (
          <span className="text-muted-foreground">Role para carregar mais</span>
        ) : (
          <span className="text-sm text-muted-foreground">Você viu todos os eventos</span>
        )}
      </div>
    );
  }

  if (!event) return null;

  // Add padding to the style
  const paddedStyle: CSSProperties = {
    ...style,
    left: 12,
    right: 12,
    width: 'calc(100% - 24px)',
    paddingBottom: 12
  };

  return (
    <div style={paddedStyle}>
      <EventCard
        event={event}
        variant="compact"
        onEventClick={onEventClick}
      />
    </div>
  );
});

Row.displayName = 'VirtualizedRow';

export const VirtualizedEventList = ({
  events,
  onEventClick,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  itemSize = 140
}: VirtualizedEventListProps) => {
  const listRef = useRef<ListImperativeAPI>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Calculate container height based on viewport
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100; // 100px for bottom nav
        setContainerHeight(Math.max(400, availableHeight));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle when rows are rendered to detect if we need to load more
  const handleRowsRendered = useCallback(
    (visibleRows: { startIndex: number; stopIndex: number }) => {
      const { stopIndex } = visibleRows;
      const totalItems = events.length + (hasNextPage ? 1 : 0);
      
      // Load more when near the end
      if (stopIndex >= events.length - 2 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [events.length, hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  // Total items including loading indicator
  const itemCount = events.length + (hasNextPage || isFetchingNextPage ? 1 : 0);

  // Row component with props
  const RowComponent = useCallback(
    (props: RowComponentProps<RowProps>) => (
      <Row
        index={props.index}
        style={props.style}
        events={props.events}
        onEventClick={props.onEventClick}
        hasNextPage={props.hasNextPage}
        isFetchingNextPage={props.isFetchingNextPage}
      />
    ),
    []
  );

  return (
    <div ref={containerRef} style={{ height: containerHeight }}>
      <List<RowProps>
        listRef={listRef}
        rowCount={itemCount}
        rowHeight={itemSize}
        rowComponent={RowComponent}
        rowProps={{
          events,
          onEventClick,
          hasNextPage,
          isFetchingNextPage
        }}
        onRowsRendered={handleRowsRendered}
        overscanCount={3}
        className="scrollbar-hide"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
