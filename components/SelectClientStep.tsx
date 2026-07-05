import React, { useState, useMemo } from 'react';
import type { Client } from '../types';
import { PlusIcon, UsersIcon, RefreshIcon, ChevronLeftIcon } from './icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

interface SelectClientStepProps {
  clients: any[]; // raw Supabase rows
  onSelect: (client: Client) => void;
  onBack: () => void;
}

const SelectClientStep: React.FC<SelectClientStepProps> = ({
  clients: propClients,
  onSelect,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { createClient } = useSettings();

  const isAdmin = user?.role === 'admin';

  console.log('[SelectClientStep] propClients received:', propClients?.length ?? 0, 'first 2:', (propClients || []).slice(0,2).map(c => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl, avatar_url: (c as any).avatar_url })));
  const clients: Client[] = useMemo(() => {
    return (propClients || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      avatarUrl: c.avatar_url || c.avatarUrl,
      source: 'square',
      historicalData: [],
    }));
  }, [propClients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setCreateError('Name and email are required.');
      return;
    }
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const newClient = await createClient({
        name: newName,
        email: newEmail,
      });
      onSelect(newClient);
    } catch (error: any) {
      if (
        error.message.includes('duplicate key value violates unique constraint')
      ) {
        setCreateError('A client with this email already exists.');
      } else {
        setCreateError('Failed to create client. Please try again.');
      }
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCreating) {
    return (
      <div className="flex flex-col h-full bg-card">
        <div className="pt-3 pl-3 flex-shrink-0">
          <button onClick={() => setIsCreating(false)} className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </button>
        </div>
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold mb-1 text-foreground">
            Create New Client
          </h1>
          <p className="text-sm text-muted-foreground">
            This client will be saved to your database.
          </p>
        </div>
        <form onSubmit={handleCreateClient} className="p-4 space-y-4">
          <div>
            <label className="block bp-overline mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="w-full p-3 border border bp-container-compact outline-none text-foreground focus:border-sky"
            />
          </div>
          <div>
            <label className="block bp-overline mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
              className="w-full p-3 border border bp-container-compact outline-none text-foreground focus:border-sky"
            />
          </div>
          {createError && (
            <p className="text-red-500 text-sm font-medium">{createError}</p>
          )}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-bold py-3 px-4 bp-container-compact shadow-lg transition-all active:scale-95 bg-secondary text-secondary-foreground"
            >
              {isSubmitting ? (
                <RefreshIcon className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Save and Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 bg-card border-b border relative">
        <button onClick={onBack} className="absolute top-4 left-4 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeftIcon className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-center mb-2 tracking-tighter text-foreground">
          Select Client
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border bp-container-compact outline-none bg-muted text-foreground focus:bg-card focus:border-sky transition-all"
          />
          <div className="absolute left-3 top-3.5 text-muted-foreground">
            <UsersIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto px-4 pt-4 pb-nav space-y-3 bg-background">
        <button
          onClick={() => setIsCreating(true)}
          className="w-full p-4 bp-container-compact font-bold mb-4 shadow-md flex items-center justify-center active:scale-95 transition-all bg-accent text-accent-foreground"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Client
        </button>

        {filteredClients.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-bold text-muted-foreground">
              {searchTerm ? 'No clients match your search.' : 'No clients yet — create one above!'}
            </p>
          </div>
        ) : (
          filteredClients.map(client => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className="w-full bg-card p-3 bp-container-list shadow-sm border border flex items-center transition-all active:scale-[0.98] elevated-card"
            >
              <img
                src={client.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random`}
                alt={client.name}
                className="w-12 h-12 rounded-full mr-4 border border"
              />
              <div className="flex-grow text-left">
                <h3 className="font-bold leading-tight text-foreground">{client.name}</h3>
                <p className="bp-caption mt-0.5">
                  Source: {client.source}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                <PlusIcon className="w-4 h-4" />
              </div>
            </button>
          ))
        )}
      </div>

    </div>
  );
};

export default SelectClientStep;
