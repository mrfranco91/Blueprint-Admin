export interface SalonProvider {
  provider: string;

  fetchClients(): Promise<any[]>;
  fetchServices(): Promise<any[]>;
  createBooking(input: {
    clientExternalId: string;
    services: any[];
    startTime: string;
    endTime: string;
  }): Promise<any>;
}
