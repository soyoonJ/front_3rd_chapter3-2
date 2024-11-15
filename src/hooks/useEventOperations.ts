import { useToast } from '@chakra-ui/react';
import { atom, useAtom } from 'jotai';

import { Event, EventForm } from '../types';
import { getRepeatEvents } from '../utils/eventRepeat';

const eventsAtom = atom<Event[]>([]);

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useAtom(eventsAtom);
  const toast = useToast();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: '이벤트 로딩 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      let response;
      if (editing) {
        const originEvent = events.find((event) => event.id === (eventData as Event).id);

        const hasEventChangedToRepeat =
          originEvent?.repeat.type === 'none' && (eventData as Event).repeat.type !== 'none';

        if (hasEventChangedToRepeat) {
          const repeatEvents = getRepeatEvents(eventData as Event);
          const newEvents = repeatEvents.filter(
            (event) => event.date !== (eventData as Event).date
          );

          response = await fetch('/api/events-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: newEvents }),
          });
        } else {
          eventData = { ...eventData, repeat: { type: 'none', interval: 0 } };
        }

        response = await fetch(`/api/events/${(eventData as Event).id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else if (eventData.repeat.type === 'none') {
        response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        const events = getRepeatEvents(eventData as Event);

        response = await fetch('/api/events-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchEvents();
      onSave?.();
      toast({
        title: editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: '일정 저장 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      toast({
        title: '일정이 삭제되었습니다.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: '일정 삭제 실패',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return { events, fetchEvents, saveEvent, deleteEvent };
};
