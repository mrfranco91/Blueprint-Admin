import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { GeneratedPlan, UserRole, Service, PlanAppointment } from '../types';
import { SERVICE_COLORS } from '../data/mockData';
import { useSettings } from '../contexts/SettingsContext';
import { usePlans } from '../contexts/PlanContext';
import { useAuth } from '../contexts/AuthContext';
import { SquareIntegrationService } from '../services/squareIntegration';
import { CheckCircleIcon, CalendarIcon, RefreshIcon, GlobeIcon, PlusIcon, ChevronRightIcon, ChevronLeftIcon, ShareIcon, DocumentTextIcon } from './icons';
import { ensureAccessibleColor } from '../utils/ensureAccessibleColor';


interface PlanSummaryStepProps {
  plan: GeneratedPlan;
  role: UserRole;
  onEditPlan?: () => void;
}

type BookingStep = 'select-visit' | 'select-date' | 'select-period' | 'select-slot';
type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'all';
type DeliveryMethod = 'sms' | 'email' | 'link';

const PlanSummaryStep: React.FC<PlanSummaryStepProps> = ({ plan, role, onEditPlan }) => {
  // Log plan details for debugging
  console.log('[PLAN SUMMARY] Plan loaded:', {
    clientName: plan.client.name,
    appointmentCount: plan.appointments.length,
    services: plan.appointments[0]?.services.map(s => ({ name: s.name, id: s.id })) || []
  });

  const [isMembershipModalOpen, setMembershipModalOpen] = useState(false);
  const [isBookingModalOpen, setBookingModalOpen] = useState(false);
  
  const [bookingStep, setBookingStep] = useState<BookingStep>('select-visit');
  const [selectedVisit, setSelectedVisit] = useState<PlanAppointment | null>(null);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('sms');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isViewingMembershipDetails, setIsViewingMembershipDetails] = useState(false);
  
  const { membershipConfig, integration, services: allServices, stylists: allStylists, branding } = useSettings();
  const { savePlan, saveBooking } = usePlans();
  const { user } = useAuth();

  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const isPlanActive = plan.status === 'active';
  const isMemberOffered = plan.membershipStatus === 'offered';
  const isMemberActive = plan.membershipStatus === 'active';

  const isClient = user?.role === 'client';
  const loggedInStylist = useMemo(() => {
    if (user?.role !== 'stylist') return null;
    const stylistId = user.stylistData?.id || user.id;
    return allStylists.find((stylist) => stylist.id === stylistId) || null;
  }, [allStylists, user]);
  const canBook = user?.role === 'admin' || isClient || !!loggedInStylist?.permissions.canBookAppointments;
  const canViewClientContact = user?.role === 'admin' || isClient || !!loggedInStylist?.permissions.viewClientContact;
  const isContactRestricted = !isClient && user?.role === 'stylist' && !canViewClientContact;

  const projectedMonthlySpend = useMemo(() => plan.totalCost / 12, [plan.totalCost]);

  const qualifyingTier = useMemo(() => {
      if (!membershipConfig?.tiers || membershipConfig.tiers.length === 0) return undefined;
      const sortedTiers = [...membershipConfig.tiers].sort((a, b) => b.minSpend - a.minSpend);
      return sortedTiers.find(t => projectedMonthlySpend >= t.minSpend) || sortedTiers[sortedTiers.length - 1];
  }, [projectedMonthlySpend, membershipConfig?.tiers]);

  const invitationMessage = useMemo(() => {
    if (!qualifyingTier || !plan.client.name) return '';
    const firstName = plan.client.name.split(' ')[0];
    const perks = qualifyingTier.perks?.slice(0, 2).join(' & ') || 'exclusive benefits';
    return `Hi ${firstName}! This is ${user?.name || 'your stylist'} from the salon. Based on your new maintenance roadmap, you qualify for our ${qualifyingTier.name} status! This includes ${perks}. Check out your full roadmap here: [Link]`;
  }, [plan, qualifyingTier, user]);

  const futureVisits = useMemo(() => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      return plan.appointments.filter(a => {
          const apptDate = new Date(a.date);
          return apptDate.getTime() > today.getTime();
      });
  }, [plan.appointments]);

  const visitChartData = useMemo(() => {
    return plan.appointments.slice(0, 15).map((appt, index) => {
        const dataPoint: any = {
            name: appt.date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
            fullDate: appt.date.toLocaleDateString([], { dateStyle: 'long' }),
            index: index + 1
        };
        appt.services.forEach(s => {
            dataPoint[s.name] = (dataPoint[s.name] || 0) + s.cost;
        });
        return dataPoint;
    });
  }, [plan]);

  const serviceLegend = useMemo(() => Array.from(new Set(plan.appointments.flatMap(a => a.services.map(s => s.name)))), [plan.appointments]);
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
        const updated = await savePlan({ ...plan, status: 'active' });
        // Go back to plans list so the updated plan shows as published
        if (onEditPlan) {
          onEditPlan();
        }
    } catch (e) {
        console.error("Publishing failed:", e);
    } finally {
        setIsPublishing(false);
    }
  };

  const handleSendInvite = async () => {
    if (!canViewClientContact && !isClient && user?.role === 'stylist') {
      return;
    }

    setIsSendingInvite(true);

    const message = invitationMessage;
    const clientPhone = plan.client.phone || '';
    const clientEmail = plan.client.email || '';

    try {
        if (deliveryMethod === 'sms') {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const separator = isIOS ? '&' : '?';
            const cleanPhone = clientPhone.replace(/\D/g, '');
            window.location.href = `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
        } else if (deliveryMethod === 'email') {
            window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent("Your Salon Roadmap & Membership Invitation")}&body=${encodeURIComponent(message)}`;
        } else if (deliveryMethod === 'link') {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(message);
            }
        }

        await savePlan({ ...plan, membershipStatus: 'offered', membershipOfferSentAt: new Date().toISOString() });
        setInviteSent(true);
        setTimeout(() => {
          setMembershipModalOpen(false);
          setInviteSent(false);
        }, 1500);
    } catch (e) {
        console.error("Failed to send invite or save status", e);
    } finally {
        setIsSendingInvite(false);
    }
  };

  const handleAcceptMembership = async () => {
    setIsAccepting(true);
    try {
        await savePlan({ ...plan, membershipStatus: 'active', membershipOfferAcceptedAt: new Date().toISOString() });
        setIsViewingMembershipDetails(false);
    } catch(e) {
        console.error("Failed to accept membership:", e);
    } finally {
        setIsAccepting(false);
    }
  };

  const handleOpenBooking = () => {
      if (!canBook) return;
      setBookingModalOpen(true);
      setBookingStep('select-visit');
      setBookingSuccess(false);
      setFetchError(null);
  };
  
  const fetchAvailabilityForCalendar = async (visit: PlanAppointment) => {
    setIsFetchingSlots(true);
    setFetchError(null);
    try {
        if (!visit) throw new Error("No visit selected.");

        const loc = await SquareIntegrationService.fetchLocation();

        // Resolve stylist ID: prefer Square Team Member ID (starts with TM), fall back to allStylists
        let stylistId = isClient ? plan.stylistId : (user?.stylistData?.id || allStylists[0]?.id);

        // If stylistId doesn't start with 'TM', it's an old Supabase UUID - resolve it to the first stylist with a valid Square ID
        if (stylistId && !String(stylistId).startsWith('TM')) {
            console.log('[BOOKING CALENDAR] Stylist ID is not a Square Team Member ID, finding valid one:', stylistId);
            const validStylist = allStylists.find(s => String(s.id).startsWith('TM'));
            if (validStylist) {
                stylistId = validStylist.id;
                console.log('[BOOKING CALENDAR] Resolved to valid Square Team Member:', stylistId);
            }
        }

        console.log('[BOOKING CALENDAR] Stylist lookup:', {
            isClient,
            planStylistId: plan.stylistId,
            userStylistDataId: user?.stylistData?.id,
            allStylists: allStylists.map(s => ({ id: s.id, name: s.name })),
            resolvedId: stylistId
        });
        if (!stylistId) throw new Error("No team member selected or found.");

        const serviceToBook = visit.services[0];
        if (!serviceToBook) {
            throw new Error(`No service selected for this visit.`);
        }

        console.log('[BOOKING] Service from plan (full object):', serviceToBook);

        if (!serviceToBook.name) {
            console.error('[BOOKING] Service missing name:', serviceToBook);
            throw new Error(`Service is missing name property: ${JSON.stringify(serviceToBook)}. This plan may be corrupted. Please regenerate the plan.`);
        }

        console.log('[BOOKING] Service from plan:', { name: serviceToBook.name, id: serviceToBook.id });

        // Fetch Square catalog and validate service ID
        const squareCatalog = await SquareIntegrationService.fetchCatalog();
        console.log('[BOOKING] Catalog has', squareCatalog.length, 'services');
        console.log('[BOOKING] Catalog service IDs:', squareCatalog.map(s => s.id));

        let serviceVariationId = serviceToBook.id;

        // Check if service ID exists in current Square catalog
        const existingService = squareCatalog.find(s => s.id === serviceVariationId);
        console.log('[BOOKING] Looking for service ID', serviceVariationId, '- found:', !!existingService);

        if (!existingService) {
            // Service ID not found - try exact name match first, then case-insensitive
            console.log('[BOOKING] Trying to find by name:', serviceToBook.name);
            let squareService = squareCatalog.find(s => s.name === serviceToBook.name);

            // If exact match fails, try case-insensitive match
            if (!squareService) {
                const searchName = serviceToBook.name.toLowerCase();
                squareService = squareCatalog.find(s => s.name.toLowerCase() === searchName);
                if (squareService) {
                    console.log('[BOOKING] Found by case-insensitive name match:', serviceToBook.name, '->', squareService.name);
                }
            }

            console.log('[BOOKING] Found by name:', !!squareService);
            if (!squareService || !squareService.id) {
                const availableServices = squareCatalog.map(s => s.name).join(', ');
                throw new Error(`Service "${serviceToBook.name}" not found in your Square catalog. Available: ${availableServices}`);
            }
            serviceVariationId = squareService.id;
            console.log('[BOOKING] Mapped service to Square by name:', { name: serviceToBook.name, plannedId: serviceToBook.id, squareId: serviceVariationId });
        }

        const searchStart = new Date(visit.date);
        const now = new Date();
        now.setHours(0,0,0,0);
        if (searchStart < now) searchStart.setTime(now.getTime());

        const slots = await SquareIntegrationService.findAvailableSlots({
            locationId: loc.id,
            startAt: SquareIntegrationService.formatDate(searchStart, loc.timezone),
            teamMemberId: stylistId,
            serviceVariationId: serviceVariationId
        });

        const dates = new Set<string>();
        slots.forEach(s => {
            const d = new Date(s);
            dates.add(d.toISOString().split('T')[0]);
        });
        setAvailableDates(dates);
    } catch (e: any) { 
        setFetchError(e.message); 
    } finally { 
        setIsFetchingSlots(false); 
    }
  };

  const handleVisitSelected = (visit: PlanAppointment) => {
    setSelectedVisit(visit);
    setBookingDate(visit.date);
    setCalendarMonth(visit.date);
    fetchAvailabilityForCalendar(visit);
    setBookingStep('select-date');
  };

  const confirmPeriodAndFetch = async (period: TimePeriod) => {
    setTimePeriod(period);
    setBookingStep('select-slot');
    setIsFetchingSlots(true);
    setFetchError(null);

    try {
        if (!selectedVisit || !bookingDate) throw new Error("No visit selected.");

        const loc = await SquareIntegrationService.fetchLocation();

        // Resolve stylist ID: prefer Square Team Member ID (starts with TM), fall back to allStylists
        let stylistId = isClient ? plan.stylistId : (user?.stylistData?.id || allStylists[0]?.id);

        // If stylistId doesn't start with 'TM', it's an old Supabase UUID - resolve it to the first stylist with a valid Square ID
        if (stylistId && !String(stylistId).startsWith('TM')) {
            console.log('[BOOKING PERIOD] Stylist ID is not a Square Team Member ID, finding valid one:', stylistId);
            const validStylist = allStylists.find(s => String(s.id).startsWith('TM'));
            if (validStylist) {
                stylistId = validStylist.id;
                console.log('[BOOKING PERIOD] Resolved to valid Square Team Member:', stylistId);
            }
        }

        console.log('[BOOKING PERIOD] Stylist lookup:', {
            isClient,
            planStylistId: plan.stylistId,
            userStylistDataId: user?.stylistData?.id,
            allStylists: allStylists.map(s => ({ id: s.id, name: s.name })),
            resolvedId: stylistId
        });
        if (!stylistId) throw new Error("No team member selected or found.");

        const serviceToBook = selectedVisit.services[0];
        if (!serviceToBook) {
            throw new Error(`No service selected for this visit.`);
        }

        // Fetch Square catalog and validate service ID
        const squareCatalog = await SquareIntegrationService.fetchCatalog();
        let serviceVariationId = serviceToBook.id;

        // Check if service ID exists in current Square catalog
        const existingService = squareCatalog.find(s => s.id === serviceVariationId);

        if (!existingService) {
            // Service ID not found - try exact name match first, then case-insensitive
            let squareService = squareCatalog.find(s => s.name === serviceToBook.name);

            // If exact match fails, try case-insensitive match
            if (!squareService) {
                const searchName = serviceToBook.name.toLowerCase();
                squareService = squareCatalog.find(s => s.name.toLowerCase() === searchName);
            }

            if (!squareService || !squareService.id) {
                const availableServices = squareCatalog.map(s => s.name).join(', ');
                throw new Error(`Service "${serviceToBook.name}" not found in your Square catalog. Available: ${availableServices}`);
            }
            serviceVariationId = squareService.id;
            console.log('[BOOKING] Mapped service to Square by name:', { name: serviceToBook.name, plannedId: serviceToBook.id, squareId: serviceVariationId });
        }

        const searchStart = new Date(bookingDate);
        searchStart.setDate(searchStart.getDate() - 3);
        const now = new Date();
        if (searchStart < now) searchStart.setTime(now.getTime());

        const slots = await SquareIntegrationService.findAvailableSlots({
            locationId: loc.id,
            startAt: SquareIntegrationService.formatDate(searchStart, loc.timezone),
            teamMemberId: stylistId,
            serviceVariationId: serviceVariationId
        });
        setAvailableSlots(slots);
    } catch (e: any) {
        setFetchError(e.message);
    } finally {
        setIsFetchingSlots(false);
    }
  };

  const filteredSlots = useMemo(() => {
      return availableSlots.filter(s => {
          const hour = new Date(s).getHours();
          if (timePeriod === 'morning') return hour < 12;
          if (timePeriod === 'afternoon') return hour >= 12 && hour < 17;
          if (timePeriod === 'evening') return hour >= 17;
          return true;
      });
  }, [availableSlots, timePeriod]);

  const groupedSlots = useMemo(() => {
      const groups: { [key: string]: string[] } = {};
      filteredSlots.forEach(s => {
          const day = new Date(s).toDateString();
          if (!groups[day]) groups[day] = [];
          groups[day].push(s);
      });
      return groups;
  }, [filteredSlots]);

  const executeBooking = async (slotTime: string) => {
      setIsBooking(true);
      setFetchError(null);
      try {
          const mockServices = selectedVisit!.services;
          if (!mockServices || mockServices.length === 0) {
              throw new Error("No services were selected for this visit.");
          }

          // Map service IDs to real Square IDs if needed
          const squareCatalog = await SquareIntegrationService.fetchCatalog();

          const squareServices = mockServices.map(ms => {
              // Check if this service ID exists in current Square catalog
              const existing = squareCatalog.find(s => s.id === ms.id);
              if (existing) {
                  return existing; // Already has valid Square ID
              }
              // Service ID not found - try exact name match first, then case-insensitive
              let found = squareCatalog.find(s => s.name === ms.name);

              // If exact match fails, try case-insensitive match
              if (!found) {
                  const searchName = ms.name.toLowerCase();
                  found = squareCatalog.find(s => s.name.toLowerCase() === searchName);
              }

              if (!found) {
                  throw new Error(`Service "${ms.name}" not found in your Square catalog.`);
              }
              return found;
          });

          // Resolve stylist ID: prefer Square Team Member ID (starts with TM), fall back to allStylists
          let stylistIdToBookFor = isClient ? plan.stylistId : (user?.stylistData?.id || allStylists[0]?.id);

          // If stylistId doesn't start with 'TM', it's an old Supabase UUID - resolve it to the first stylist with a valid Square ID
          if (stylistIdToBookFor && !String(stylistIdToBookFor).startsWith('TM')) {
              const validStylist = allStylists.find(s => String(s.id).startsWith('TM'));
              if (validStylist) {
                  stylistIdToBookFor = validStylist.id;
              }
          }

          if (user?.role === 'stylist' && loggedInStylist) {
              const isBookingForSelf = stylistIdToBookFor === loggedInStylist.id;

              if (isBookingForSelf && !loggedInStylist.permissions.can_book_own_schedule) {
                  throw new Error("You do not have permission to book appointments for your own schedule.");
              }

              if (!isBookingForSelf && !loggedInStylist.permissions.can_book_peer_schedules) {
                  throw new Error("You do not have permission to book appointments for other team members.");
              }
          }

          const loc = await SquareIntegrationService.fetchLocation();

          let customerId = plan.client.externalId || await SquareIntegrationService.searchCustomer(plan.client.name);
          if (!customerId) throw new Error(`Could not find client "${plan.client.name}" in Square.`);

          const squareResponse = await SquareIntegrationService.createAppointment({
              locationId: loc.id,
              startAt: slotTime,
              customerId,
              teamMemberId: stylistIdToBookFor,
              services: squareServices
          });

          const squareBooking = squareResponse.booking;
          if (squareBooking) {
              await saveBooking({
                  id: squareBooking.id,
                  client_id: plan.client.id,
                  stylist_id: stylistIdToBookFor,
                  start_time: slotTime,
                  status: squareBooking.status,
                  services: squareServices.map(s => ({ variation_id: s.id, name: s.name })),
                  source: 'square'
              });
          }
          
          const bookedDate = new Date(slotTime);
          const recommendedDate = new Date(selectedVisit!.date);
          bookedDate.setHours(0, 0, 0, 0);
          recommendedDate.setHours(0, 0, 0, 0);
          const offset = bookedDate.getTime() - recommendedDate.getTime();
          
          if (offset !== 0) {
              const updatedAppointments = plan.appointments.map(appt => {
                  const apptDate = new Date(appt.date);
                  if (apptDate.getTime() >= recommendedDate.getTime()) {
                      return { ...appt, date: new Date(apptDate.getTime() + offset) };
                  }
                  return appt;
              });
              const updatedPlan = { ...plan, appointments: updatedAppointments };
              await savePlan(updatedPlan);
          }

          setBookingSuccess(true);
          setTimeout(() => setBookingModalOpen(false), 2000);
      } catch (e: any) {
          setFetchError(e.message);
      } finally {
          setIsBooking(false);
      }
  };

  const isMissingContact = useMemo(() => {
    if (!canViewClientContact) return false;
    if (deliveryMethod === 'sms') return !plan.client.phone;
    if (deliveryMethod === 'email') return !plan.client.email;
    return false;
  }, [canViewClientContact, deliveryMethod, plan.client]);
  
  const buttonStyle = {
      backgroundColor: branding.primaryColor,
      color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#1F2937')
  };

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarBlanks = Array(firstDayOfMonth).fill(null);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-brand-bg relative">
      <div className="flex-grow p-4 overflow-y-auto text-gray-950">
        <div className="mb-6 flex justify-between items-end border-b-2 border-gray-100 pb-4">
            <div>
                <h1 className="text-2xl font-black text-gray-950 tracking-tighter leading-none mb-1">Blueprint Summary</h1>
                <p className="text-base font-black text-gray-900 uppercase tracking-widest">{plan.client.name}</p>
            </div>
            <span className={`text-xs font-black px-4 py-1.5 rounded-full border-2 shadow-sm ${isPlanActive ? 'bg-green-50 text-green-900 border-green-400' : 'bg-gray-100 text-gray-950 border-gray-400'}`}>
                {isPlanActive ? 'PUBLISHED' : 'DRAFT'}
            </span>
        </div>

        {isClient && isMemberOffered && (
            <div className="mb-6 p-6 rounded-[32px] shadow-xl animate-fade-in border-4" style={{ borderColor: branding.primaryColor, backgroundColor: '#FFF' }}>
                <h2 className="text-xl font-black tracking-tighter mb-4" style={{color: branding.primaryColor}}>Membership Invitation</h2>
                <p className="text-sm font-bold text-gray-700 mb-4 leading-relaxed">
                    Your blueprint qualifies for a membership! Review the details to enjoy a more predictable and streamlined salon experience.
                </p>
                <button 
                    onClick={() => setIsViewingMembershipDetails(true)}
                    className="w-full font-black py-4 rounded-2xl shadow-lg flex items-center justify-center space-x-3 active:scale-95 transition-all border-b-4 border-black/20"
                    style={buttonStyle}
                >
                    See Membership Details
                </button>
            </div>
        )}

        {isClient && isMemberActive && (
             <div className="mb-6 p-6 rounded-[32px] shadow-lg animate-fade-in border-4 border-green-500 bg-green-50 text-center">
                <CheckCircleIcon className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <h2 className="text-lg font-black tracking-tighter text-green-900">You’re enrolled! This blueprint is now your active membership.</h2>
            </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 bg-gray-950 p-6 rounded-[32px] text-white shadow-2xl flex justify-between items-center border-4 border-gray-900">
                <div>
                    <p className="text-sm font-black uppercase text-gray-300 mb-1 tracking-widest">Yearly Investment</p>
                    <p className="text-5xl font-black" style={{ color: branding.secondaryColor }}>{formatCurrency(plan.totalCost)}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black uppercase text-gray-400 mb-1 tracking-widest">Membership Tier</p>
                    <p className="text-xl font-black" style={{color: qualifyingTier?.color || '#000'}}>{qualifyingTier?.name || 'Standard'}</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-lg">
                <p className="text-sm font-black uppercase text-gray-900 mb-1 tracking-widest">Avg. Visit</p>
                <p className="text-3xl font-black text-gray-950">{formatCurrency(plan.averageAppointmentCost)}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border-4 border-gray-100 shadow-lg">
                <p className="text-sm font-black uppercase text-gray-900 mb-1 tracking-widest">Avg. Monthly</p>
                <p className="text-3xl font-black text-gray-950">{formatCurrency(plan.averageMonthlySpend)}</p>
            </div>
            <div className="col-span-2 bg-brand-accent p-5 rounded-3xl shadow-xl flex justify-between items-center">
                <span className="text-sm font-black text-white uppercase tracking-widest">Planned Visits</span>
                <span className="text-3xl font-black text-white">{plan.totalYearlyAppointments}</span>
            </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border-4 border-gray-100 mb-8 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase text-gray-900 tracking-widest">Visit Value Forecast</h3>
                <span className="text-[10px] font-black text-gray-400 uppercase">Cost Per Appointment</span>
            </div>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="name" 
                            tick={{fontSize: 10, fontWeight: 900, fill: '#666'}} 
                            axisLine={{stroke:'#eee', strokeWidth:2}} 
                            tickLine={false}
                            interval={0}
                            angle={-45}
                            textAnchor="end"
                        />
                        <YAxis 
                            tick={{fontSize: 10, fontWeight: 900, fill: '#666'}} 
                            axisLine={{stroke:'#eee', strokeWidth:2}} 
                            tickLine={false} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{backgroundColor: '#000', color: '#fff', borderRadius: '16px', border: 'none', fontWeight: 900}} 
                        />
                        {serviceLegend.map((name: string) => (
                            <Bar 
                                key={name} 
                                dataKey={name} 
                                stackId="a" 
                                fill={SERVICE_COLORS[name] || '#cbd5e1'} 
                                radius={[0,0,0,0]} 
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {serviceLegend.map((name: string) => (
                    <div key={name} className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: SERVICE_COLORS[name] || '#cbd5e1'}}></div>
                        <span className="text-[10px] font-black text-gray-600 uppercase">{name}</span>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="mt-8 pt-8 border-t-4 border-gray-100 flex flex-col space-y-4">
            {!isClient && !isPlanActive && (
                <button onClick={handlePublish} disabled={isPublishing} className="w-full bg-gray-950 text-white py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all border-b-4 border-gray-800">
                    {isPublishing ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <GlobeIcon className="w-6 h-6" />}
                    <span>PUBLISH TO CLIENT</span>
                </button>
            )}
            
            {!isClient && (
                <button 
                    onClick={() => setMembershipModalOpen(true)}
                    className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-all border-b-4 ${isMemberOffered || isMemberActive ? 'bg-green-600 text-white border-green-900' : 'border-black/20'}`}
                    style={!(isMemberOffered || isMemberActive) ? { backgroundColor: branding.primaryColor, color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF') } : {}}
                >
                    {isMemberOffered || isMemberActive ? <CheckCircleIcon className="w-6 h-6" /> : <PlusIcon className="w-6 h-6" />}
                    <span>{isMemberOffered ? 'INVITATION SENT' : isMemberActive ? 'MEMBERSHIP ACTIVE' : 'SEND MEMBERSHIP INVITATION'}</span>
                </button>
            )}

            <button 
                onClick={handleOpenBooking} 
                disabled={!canBook}
                className={`w-full py-5 rounded-2xl font-black text-lg shadow-md active:scale-95 transition-all flex items-center justify-center space-x-3 border-b-8 ${canBook ? 'bg-white text-gray-950 border-gray-950' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
            >
                <CalendarIcon className={`w-6 h-6 ${canBook ? '' : 'text-gray-300'}`} style={canBook ? { color: branding.secondaryColor } : {}}/>
                <span>{isClient ? 'BOOK APPOINTMENT' : canBook ? 'Book an Upcoming Appointment' : 'SYNC DISABLED'}</span>
            </button>
        </div>
      </div>

      {isMembershipModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
              <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative overflow-hidden border-4 border-gray-950 flex flex-col">
                  <div className="p-7 text-center" style={{ backgroundColor: branding.primaryColor }}>
                      <h2 className="text-2xl font-black tracking-tight" style={{ color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF') }}>Membership Invitation</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF'), opacity: 0.8 }}>Upgrade {plan.client.name.split(' ')[0]}'s Experience</p>
                  </div>
                  
                  <div className="p-6">
                      {inviteSent ? (
                        <div className="py-12 text-center animate-bounce-in">
                            <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                            <p className="text-2xl font-black text-gray-950">INVITE SENT!</p>
                            <p className="text-sm text-gray-500 font-bold mt-2">Client marked as 'Offered'</p>
                        </div>
                      ) : (
                        <div className="space-y-6 text-gray-950">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Method</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setDeliveryMethod('sms')} className={`p-3 rounded-2xl border-4 font-black text-xs transition-all ${deliveryMethod === 'sms' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>SMS</button>
                                    <button onClick={() => setDeliveryMethod('email')} className={`p-3 rounded-2xl border-4 font-black text-xs transition-all ${deliveryMethod === 'email' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>EMAIL</button>
                                    <button onClick={() => setDeliveryMethod('link')} className={`p-3 rounded-2xl border-4 font-black text-xs transition-all ${deliveryMethod === 'link' ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'border-gray-50 bg-gray-50 text-gray-400'}`}>LINK</button>
                                </div>
                            </div>

                            {isContactRestricted && (
                                <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-100 flex items-start space-x-3">
                                    <div className="bg-amber-500 text-white rounded-full p-1 mt-0.5">!</div>
                                    <div>
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Permission Required</p>
                                        <p className="text-[11px] font-bold text-amber-900 leading-tight">You do not have access to client contact details. Ask an admin to enable contact visibility for your level.</p>
                                    </div>
                                </div>
                            )}
                            {isMissingContact && (
                                <div className="bg-red-50 p-4 rounded-2xl border-2 border-red-100 flex items-start space-x-3">
                                    <div className="bg-red-500 text-white rounded-full p-1 mt-0.5">!</div>
                                    <div>
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Contact Missing</p>
                                        <p className="text-[11px] font-bold text-red-800 leading-tight">No {deliveryMethod === 'sms' ? 'phone' : 'email'} found for this client. You can still open the app, but you'll need to manually enter the recipient.</p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Message Preview</p>
                                <div className="bg-white p-4 rounded-2xl border-2 border-gray-200 text-xs font-bold text-gray-800 leading-relaxed italic shadow-inner">
                                    "{invitationMessage}"
                                </div>
                            </div>

                            <button
                                onClick={handleSendInvite}
                                disabled={isSendingInvite || isContactRestricted}
                                className="w-full font-black py-5 rounded-2xl shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all border-b-8 border-black/20 disabled:opacity-50"
                                style={{ backgroundColor: branding.primaryColor, color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF') }}
                            >
                                {isSendingInvite ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <ShareIcon className="w-6 h-6" />}
                                <span>{isSendingInvite ? 'OPENING...' : isContactRestricted ? 'CONTACT ACCESS REQUIRED' : `OPEN ${deliveryMethod.toUpperCase()}`}</span>
                            </button>
                            
                            <button onClick={() => setMembershipModalOpen(false)} className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-950 transition-colors">Cancel</button>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isViewingMembershipDetails && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative overflow-hidden border-4 border-gray-950 flex flex-col max-h-[90vh]">
                <div className="p-7 text-center" style={{ backgroundColor: branding.primaryColor }}>
                    <h2 className="text-2xl font-black tracking-tight" style={{ color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF') }}>Membership Details</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: ensureAccessibleColor('#FFFFFF', branding.primaryColor, '#FFFFFF'), opacity: 0.8 }}>Based on Your Blueprint</p>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    <div className="mb-6 bg-gray-50 p-5 rounded-3xl border-2 border-gray-100 text-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Your Membership Level</p>
                        <p className="text-2xl font-black" style={{ color: qualifyingTier?.color || '#000' }}>{qualifyingTier?.name || 'Standard'}</p>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3 text-center">Included Perks</h3>
                        {qualifyingTier?.perks && qualifyingTier.perks.length > 0 ? (
                            <ul className="space-y-3">
                                {qualifyingTier.perks.map((perk, index) => (
                                    <li key={index} className="flex items-start text-sm font-bold text-gray-800">
                                        <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                                        <span>{perk}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-center text-xs font-bold text-gray-500">
                                <p>This membership includes benefits defined by your salon. Your stylist can walk you through the details.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-gray-50 border-2 border-gray-100 p-4 rounded-2xl text-center text-xs font-bold text-gray-800 mb-6">
                        <p>Your membership is custom-tailored to you and is based on the services you and your stylist agreed on when creating your maintenance blueprint.</p>
                        <p className="mt-2 text-gray-500 text-[10px] italic">*Additional services not included in your blueprint may be an additional cost, unless explicitly listed as a membership perk.</p>
                    </div>

                    <button 
                        onClick={handleAcceptMembership}
                        disabled={isAccepting}
                        className="w-full font-black py-5 rounded-2xl shadow-xl flex items-center justify-center space-x-3 active:scale-95 transition-all border-b-8 border-black/20"
                        style={buttonStyle}
                    >
                        {isAccepting ? <RefreshIcon className="w-6 h-6 animate-spin"/> : "Enroll in Membership"}
                    </button>
                </div>
                
                <button onClick={() => setIsViewingMembershipDetails(false)} className="w-full p-6 text-gray-950 font-black uppercase tracking-widest text-[10px] border-t-4 border-gray-50 hover:bg-gray-50 transition-colors">
                    Maybe Later
                </button>
            </div>
        </div>
      )}

      {isBookingModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
              <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative overflow-hidden border-4 border-gray-950 flex flex-col max-h-[90vh]">
                  
                  <div className="bg-gray-950 text-white p-6 relative">
                    {bookingStep !== 'select-visit' && !bookingSuccess && (
                        <button onClick={() => {
                           if (bookingStep === 'select-slot') setBookingStep('select-period');
                           else if (bookingStep === 'select-period') setBookingStep('select-date');
                           else if (bookingStep === 'select-date') setBookingStep('select-visit');
                        }} className="absolute left-4 top-6">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                    <h2 className="text-xl font-black text-center">Square Booking</h2>
                    <p className="text-[10px] text-center text-gray-400 font-black uppercase tracking-widest mt-1">
                        {bookingStep === 'select-visit' ? 'Which visit are you booking?' : 
                         bookingStep === 'select-date' ? 'Confirm your appointment date' :
                         bookingStep === 'select-period' ? 'What time of day do you prefer?' : 'Choose your perfect opening'}
                    </p>
                  </div>

                  <div className="p-6 overflow-y-auto flex-grow">
                      {bookingSuccess ? (
                          <div className="py-12 text-center animate-bounce-in">
                              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                              <p className="text-3xl font-black text-gray-950">BOOKED!</p>
                              <p className="text-lg text-gray-950 font-black mt-2">Added to Square calendar.</p>
                          </div>
                      ) : fetchError ? (
                          <div className="p-6 bg-red-50 text-red-950 rounded-3xl border-4 border-red-500 text-center">
                              <p className="font-black uppercase text-xs mb-3 text-red-700">Square Error</p>
                              <p className="text-base font-black leading-relaxed mb-6">{fetchError}</p>
                              <button onClick={() => setBookingModalOpen(false)} className="w-full py-4 bg-red-700 text-white rounded-2xl font-black uppercase shadow-xl border-b-4 border-red-900">Close</button>
                          </div>
                      ) : (
                          <>
                              {bookingStep === 'select-visit' && (
                                  <div className="space-y-3 text-gray-950">
                                      <p className="text-center text-xs text-gray-500 pb-2">Select a planned visit below. You'll confirm the exact date in the next step.</p>
                                      {futureVisits.length > 0 ? futureVisits.map((visit, i) => {
                                          const totalCost = visit.services.reduce((sum, s) => sum + s.cost, 0);
                                          const totalDuration = visit.services.reduce((sum, s) => sum + s.duration, 0);
                                          const formatDuration = (minutes: number) => {
                                              const h = Math.floor(minutes / 60);
                                              const m = minutes % 60;
                                              return `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}`.trim() || '0m';
                                          };
                                          return (
                                              <button key={i} onClick={() => handleVisitSelected(visit)} className="w-full p-5 border-4 border-gray-100 rounded-3xl text-left flex flex-col group active:scale-95 transition-all hover:border-brand-accent">
                                                  <div className="flex justify-between items-center w-full">
                                                      <div className="text-gray-950">
                                                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Upcoming Visit</p>
                                                          <p className="text-xl font-black group-hover:text-brand-accent">{visit.date.toLocaleDateString([], {month:'long', day:'numeric'})}</p>
                                                      </div>
                                                      <ChevronRightIcon className="w-6 h-6 text-gray-300" />
                                                  </div>
                                                  
                                                  <div className="border-t-2 border-gray-100 mt-4 pt-4 space-y-2">
                                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visit Details:</p>
                                                      <div className="flex justify-between items-center text-sm">
                                                          <span className="font-bold text-gray-600">Services:</span>
                                                          <span className="font-black text-gray-900 truncate max-w-[150px]">{visit.services.map(s => s.name).join(' + ')}</span>
                                                      </div>
                                                      <div className="flex justify-between items-center text-sm">
                                                          <span className="font-bold text-gray-600">Est. Cost:</span>
                                                          <span className="font-black text-gray-900">${totalCost.toFixed(0)}</span>
                                                      </div>
                                                      <div className="flex justify-between items-center text-sm">
                                                          <span className="font-bold text-gray-600">Est. Time:</span>
                                                          <span className="font-black text-gray-900">{formatDuration(totalDuration)}</span>
                                                      </div>
                                                  </div>
                                              </button>
                                          )
                                      }) : (
                                          <div className="text-center py-10">
                                              <p className="font-black text-gray-950 text-lg leading-tight">No future blueprint visits<br/>available to sync.</p>
                                          </div>
                                      )}
                                  </div>
                              )}

                              {bookingStep === 'select-date' && (
                                isFetchingSlots ? (
                                    <div className="py-16 text-center">
                                        <RefreshIcon className="w-16 h-16 text-brand-accent animate-spin mx-auto mb-6" />
                                        <p className="font-black text-gray-950 uppercase tracking-widest">Finding Openings...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-center p-3 bg-gray-50 rounded-2xl border-2 border-gray-100 mb-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recommended Date</p>
                                            <p className="font-black text-gray-800 text-base">{selectedVisit?.date.toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</p>
                                        </div>

                                        <div className="bg-white p-3 rounded-2xl border-2 border-gray-100">
                                            <div className="flex justify-between items-center mb-3 px-2">
                                                <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
                                                <h3 className="font-black text-gray-800">{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                                                <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
                                            </div>
                                            <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 mb-2">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1">
                                                {calendarBlanks.map((_, i) => <div key={`blank-${i}`}></div>)}
                                                {calendarDays.map(day => {
                                                    const thisDate = new Date(year, month, day);
                                                    const dateStr = thisDate.toISOString().split('T')[0];
                                                    const isAvailable = availableDates.has(dateStr);
                                                    const isSelected = bookingDate ? bookingDate.toISOString().split('T')[0] === dateStr : false;
                                                    
                                                    return (
                                                        <button 
                                                            key={day} 
                                                            disabled={!isAvailable}
                                                            onClick={() => {
                                                                const newDate = new Date(dateStr);
                                                                const timezoneOffset = newDate.getTimezoneOffset() * 60000;
                                                                setBookingDate(new Date(newDate.getTime() + timezoneOffset));
                                                            }}
                                                            className={`p-2 rounded-full font-black text-sm aspect-square transition-all ${
                                                                isSelected ? 'bg-brand-primary text-white scale-110 shadow-lg' : 
                                                                isAvailable ? 'bg-white hover:bg-blue-50 text-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setBookingStep('select-period')}
                                            disabled={!bookingDate}
                                            className="w-full text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95 border-b-8 border-black/20 disabled:bg-gray-400"
                                            style={!bookingDate ? {} : buttonStyle}
                                        >
                                            Confirm Date
                                        </button>
                                    </div>
                                )
                              )}
                              
                              {bookingStep === 'select-period' && (
                                  <div className="space-y-4">
                                      <button onClick={() => confirmPeriodAndFetch('morning')} className="w-full p-6 bg-blue-50 border-4 border-blue-200 rounded-3xl text-left flex items-center space-x-4 active:scale-95 transition-all">
                                          <div className="bg-blue-500 text-white p-3 rounded-2xl text-xl">🌅</div>
                                          <div>
                                              <p className="text-xl font-black text-gray-950 leading-none">Morning</p>
                                              <p className="text-xs font-black uppercase tracking-widest text-blue-900 mt-2">Before 12:00 PM</p>
                                          </div>
                                      </button>
                                      <button onClick={() => confirmPeriodAndFetch('afternoon')} className="w-full p-6 bg-orange-50 border-4 border-orange-200 rounded-3xl text-left flex items-center space-x-4 active:scale-95 transition-all">
                                          <div className="bg-orange-500 text-white p-3 rounded-2xl text-xl">☀️</div>
                                          <div>
                                              <p className="text-xl font-black text-gray-950 leading-none">Afternoon</p>
                                              <p className="text-xs font-black uppercase tracking-widest text-orange-900 mt-2">12:00 PM - 5:00 PM</p>
                                          </div>
                                      </button>
                                      <button onClick={() => confirmPeriodAndFetch('evening')} className="w-full p-6 bg-indigo-50 border-4 border-indigo-200 rounded-3xl text-left flex items-center space-x-4 active:scale-95 transition-all">
                                          <div className="bg-indigo-500 text-white p-3 rounded-2xl text-xl">🌙</div>
                                          <div>
                                              <p className="text-xl font-black text-gray-950 leading-none">Evening</p>
                                              <p className="text-xs font-black uppercase tracking-widest text-indigo-900 mt-2">After 5:00 PM</p>
                                          </div>
                                      </button>
                                  </div>
                              )}

                              {bookingStep === 'select-slot' && (
                                  <div className="space-y-6">
                                      {Object.keys(groupedSlots).length > 0 ? Object.entries(groupedSlots).map(([day, slots]) => (
                                          <div key={day}>
                                              <h3 className="text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest border-b-2 border-gray-100 pb-2">{day}</h3>
                                              <div className="grid grid-cols-2 gap-2">
                                                  {(slots as string[]).map((s, i) => (
                                                      <button key={i} onClick={() => executeBooking(s)} disabled={isBooking} className="p-4 border-4 border-gray-100 rounded-2xl text-center hover:border-brand-accent hover:bg-blue-50 active:scale-95 transition-all text-gray-950">
                                                          <span className="font-black text-base">{new Date(s).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      )) : (
                                          <div className="text-center py-10 text-gray-950">
                                              <p className="font-black text-lg leading-tight">No {timePeriod !== 'all' ? timePeriod : ''} openings<br/>found this week.</p>
                                              <button onClick={() => setBookingStep('select-period')} className="mt-4 text-brand-accent font-black underline">Change preference</button>
                                          </div>
                                      )}
                                  </div>
                              )}
                          </>
                      )}
                  </div>

                  {!bookingSuccess && (
                      <button onClick={() => setBookingModalOpen(false)} className="w-full p-6 text-gray-950 font-black uppercase tracking-widest text-[10px] border-t-4 border-gray-50 hover:bg-gray-50 transition-colors">Cancel Booking</button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default PlanSummaryStep;
