import { redirect } from 'next/navigation';

export default function EventsPage() {
  // Events merged into Executive Ops Calendar
  // This route preserved for backward compatibility
  redirect('/executive-ops/calendar');
}
