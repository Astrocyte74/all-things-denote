export interface Challenge {
  id: string;
  number: number;
  title: string;
  photoTarget: string;
  gospelConnection: string;
  scripture?: string;
  completed: boolean;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  challenges: Challenge[];
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface BonusItem {
  id: string;
  title: string;
  hint: string;
  connection: string;
  icon: string;
  color: string;
}
