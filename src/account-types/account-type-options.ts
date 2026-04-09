import { UserAccountType } from '../schema/User.schema';

export type AccountTypeOption = {
  id: UserAccountType;
  title: string;
  subText: string;
};

export const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  {
    id: UserAccountType.PRIVATE_CLIENT_BROKER,
    title: 'Private clients / Broker',
    subText: 'Book jets & charter',
  },
  {
    id: UserAccountType.OPERATOR,
    title: 'Operator',
    subText: 'Manage fleet & sales',
  },
  {
    id: UserAccountType.PILOT,
    title: 'Pilots',
    subText: 'Find ferry flights & jobs',
  },
  {
    id: UserAccountType.ENGINEER_CREW,
    title: 'Engineer / Crew',
    subText: 'Maintenance & service',
  },
  {
    id: UserAccountType.HBU_PARTNER,
    title: 'HBU Partner',
    subText: 'Manage airport services',
  },
];
