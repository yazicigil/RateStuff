'use client';
import ItemsTab from '@/components/me/ItemsTab';

type Props = {
  items: any[];
  trending: any[];
  loading: boolean;
  myId: string;
  amAdmin: boolean;
};

export default function ItemsCardClient({ items, trending, loading, myId, amAdmin }: Props) {
  const notify = (_msg?: string) => {};
  const onReload = () => {};

  return (
    <ItemsTab
      items={items as any}
      trending={trending}
      loading={loading}
      myId={myId}
      amAdmin={amAdmin}
      notify={notify as any}
      onReload={onReload as any}
    />
  );
}
