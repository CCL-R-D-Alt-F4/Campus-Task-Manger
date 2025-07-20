// types.ts
export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'member' | 'staff';
  name: string;
  position: 'Member' | 'Co-Leader' | 'Leader' | 'Admin' | 'Staff';
  createdAt: Date;
  lastActive?: Date;
}

 