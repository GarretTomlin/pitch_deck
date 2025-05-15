import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  GenerateDeckRequest,
  Slide,
  AgUIEvent,
  DeckGeneratorState
} from '@orb_deck/shared-types';
import { toast } from 'sonner';

export interface UseAgentWorkflowOptions {
  onProgress?: (progress: number) => void;
  onSlideGenerated?: (slide: Slide) => void;
  onComplete?: (deckId: string) => void;
  onError?: (error: Error) => void;
}

export function useAgentWorkflow(
  sessionId: string,
  options: UseAgentWorkflowOptions = {}
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<DeckGeneratorState | null>(null);
  const [events, setEvents] = useState<AgUIEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const eventsRef = useRef<AgUIEvent[]>([]);
  const stateRef = useRef<DeckGeneratorState | null>(null);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001', {
      query: { sessionId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      socketInstance.emit('join', sessionId);
      toast.success('Connected to AI service');
    });

    socketInstance.on('agui:event', (event: AgUIEvent) => {
      eventsRef.current = [...eventsRef.current, event];
      setEvents([...eventsRef.current]);
      
      switch (event.type) {
        case 'workflow.start': {
          setIsGenerating(true);
          toast.info('Starting pitch deck generation...');
          break;
        }
          
        case 'state.update': {
          const stateData = event.data as Partial<DeckGeneratorState>;
          const newState = { ...stateRef.current, ...stateData } as DeckGeneratorState;
          stateRef.current = newState;
          setState(newState);
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const progress = (stateData as any).progress;
          if (progress !== undefined) {
            setProgress(progress);
            options.onProgress?.(progress);
          }
          break;
        }
          
        case 'slide.generated': {
          options.onSlideGenerated?.(event.data.slide);
          toast.success(`Generated slide: ${event.data.slide.title}`);
          break;
        }
          
        case 'workflow.complete': {
          setIsGenerating(false);
          toast.success('Pitch deck generated successfully!');
          options.onComplete?.(event.data.deckId);
          break;
        }
          
        case 'workflow.error': {
          setIsGenerating(false);
          toast.error(`Error: ${event.data.error}`);
          options.onError?.(event.data);
          break;
        }
          
        case 'human.input.request': {
          // Handle human feedback request
          break;
        }
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Disconnected from AI service');
    });

    socketInstance.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      toast.error('Failed to connect to AI service');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [sessionId, options]);

  const sendInput = useCallback((input: Record<string, unknown>) => {
    if (socket && isConnected) {
      socket.emit('human:input', {
        sessionId,
        input,
      });
    }
  }, [socket, sessionId, isConnected]);

  const startWorkflow = useCallback((request: GenerateDeckRequest) => {
    if (socket && isConnected) {
      socket.emit('workflow:start', {
        sessionId,
        request,
      });
      setIsGenerating(true);
    }
  }, [socket, sessionId, isConnected]);

  const cancelWorkflow = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('workflow:cancel', {
        sessionId,
      });
      setIsGenerating(false);
    }
  }, [socket, sessionId, isConnected]);

  const provideFeedback = useCallback((feedback: Record<string, unknown>) => {
    if (socket && isConnected) {
      socket.emit('workflow:feedback', {
        sessionId,
        feedback,
      });
    }
  }, [socket, sessionId, isConnected]);

  return {
    state,
    events,
    isConnected,
    isGenerating,
    progress,
    sendInput,
    startWorkflow,
    cancelWorkflow,
    provideFeedback,
  };
}