import React from 'react';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Mailbox } from '../utils/types';
import MailboxRow from './MailboxRow';

interface DraggableMailboxListProps {
  mailboxes: Mailbox[];
  onToggle: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function DraggableMailboxList({
  mailboxes,
  onToggle,
  onReorder,
}: DraggableMailboxListProps) {
  return (
    <DraggableFlatList
      data={mailboxes}
      keyExtractor={(item) => item.id}
      onDragEnd={({ data }) => onReorder(data.map((mb) => mb.id))}
      renderItem={({ item, drag, isActive }: RenderItemParams<Mailbox>) => (
        <MailboxRow
          mailbox={item}
          onToggle={onToggle}
          onLongPressDrag={drag}
          isActive={isActive}
        />
      )}
      containerStyle={{ flex: 1 }}
    />
  );
}
