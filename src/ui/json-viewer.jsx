import ReactJson from '@microlink/react-json-view';
import { ScrollArea } from '@/ui/scroll-area';
import { cn } from '@/helpers/utils';

// Debug-mode payload inspector — not part of the shadcn registry, ported
// from pinia. Needs `@microlink/react-json-view` + the shadcn ScrollArea.
export const JsonViewer = ({ src, className, ...props }) => (
    <ScrollArea data-block='json-viewer' className={cn('rounded-md border text-xs', className)}>
        <ReactJson
            src={src}
            theme='ocean'
            style={{ padding: '0.75rem', background: 'transparent' }}
            {...props}
        />
    </ScrollArea>
);
