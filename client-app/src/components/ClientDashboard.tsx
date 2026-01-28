import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlans } from '../contexts/PlanContext';
import { useSettings } from '../contexts/SettingsContext';
import { CalendarIcon, DocumentTextIcon } from './icons';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { plans, getClientBookings } = usePlans();
  const { branding } = useSettings();

  const clientId = user?.id ? String(user.id) : '';

  const latestPlan = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [plans]);

  const upcomingVisits = useMemo(() => {
    if (!latestPlan) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return latestPlan.appointments
      .filter((visit) => visit.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [latestPlan]);

  const bookings = useMemo(() => {
    if (!clientId) return [];
    return getClientBookings(clientId).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [clientId, getClientBookings]);

  const profileName = latestPlan?.client.name || user?.name || 'Client';
  const profileEmail = latestPlan?.client.email || user?.email || 'Not provided';
  const profilePhone = latestPlan?.client.phone || 'Not provided';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

  const formatDate = (value: Date | string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Client profile</p>
          <h1 className="text-4xl font-black tracking-tight text-gray-950">Welcome, {profileName.split(' ')[0]}</h1>
          <p className="text-gray-600 font-semibold">
            Your roadmap, appointments, and profile details from {branding.salonName}.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-brand-accent" />
              <h2 className="text-xl font-black text-gray-950">Your plan overview</h2>
            </div>
            {latestPlan ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Status</p>
                  <p className="text-lg font-black text-gray-950 mt-2 capitalize">{latestPlan.status}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Total yearly spend</p>
                  <p className="text-lg font-black text-gray-950 mt-2">{formatCurrency(latestPlan.totalCost)}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Average monthly</p>
                  <p className="text-lg font-black text-gray-950 mt-2">{formatCurrency(latestPlan.averageMonthlySpend)}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Yearly visits</p>
                  <p className="text-lg font-black text-gray-950 mt-2">{latestPlan.totalYearlyAppointments}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 font-semibold">
                Your stylist is preparing your first roadmap. Check back soon for your plan details.
              </p>
            )}
          </div>

          <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6 text-brand-accent" />
              <h2 className="text-xl font-black text-gray-950">Profile details</h2>
            </div>
            <div className="space-y-3 text-sm font-semibold text-gray-700">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Name</p>
                <p className="text-gray-950 font-black mt-1">{profileName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Email</p>
                <p className="text-gray-950 font-black mt-1">{profileEmail}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black">Phone</p>
                <p className="text-gray-950 font-black mt-1">{profilePhone}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-950">Upcoming roadmap visits</h2>
              <CalendarIcon className="w-6 h-6 text-brand-accent" />
            </div>
            {upcomingVisits.length > 0 ? (
              <div className="space-y-3">
                {upcomingVisits.slice(0, 5).map((visit, index) => (
                  <div key={`${visit.date.toISOString()}-${index}`} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-sm font-black text-gray-950">{formatDate(visit.date)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mt-2">Services</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      {visit.services.map((service) => service.name).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 font-semibold">No upcoming visits found yet.</p>
            )}
          </div>

          <div className="bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-950">Booked appointments</h2>
              <DocumentTextIcon className="w-6 h-6 text-brand-accent" />
            </div>
            {bookings.length > 0 ? (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-sm font-black text-gray-950">{formatDate(booking.start_time)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-black mt-2">Services</p>
                    <p className="text-sm font-semibold text-gray-700 mt-1">
                      {booking.services.map((service) => service.name).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 font-semibold">No booked appointments yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClientDashboard;
