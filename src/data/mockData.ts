import { Event, User, Category, Badge } from '@/types';

export const EVENTS: Event[] = [
  {
    id: '1',
    title: 'Festival de Música e Arte',
    category: 'Eventos',
    subtitle: 'Este fim de semana no Parque Central',
    location: 'Parque Central',
    date: '2025-06-15',
    time: '14:00',
    price: 'Gratuito',
    description: 'Junte-se a nós para um dia vibrante de música ao vivo, exposições de arte e food trucks deliciosos. Traga sua família e amigos para celebrar a cultura local!',
    imageUrl: 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
    isTrending: true,
    isFeatured: true,
    participantsCount: 3,
    attendees: ['Juliana', 'Rafael', 'Beatriz']
  },
  {
    id: '2',
    title: 'Yoga no Parque',
    category: 'Esportes',
    location: 'Parque das Águas',
    date: '2025-06-16',
    time: '09:00',
    price: 'R$ 10',
    description: 'Comece seu domingo de forma relaxante com uma aula de yoga ao ar livre. Todos os níveis são bem-vindos. Traga seu tapete e água.',
    imageUrl: 'https://images.pexels.com/photos/3822725/pexels-photo-3822725.jpeg',
    distance: '500m',
    participantsCount: 1,
    attendees: ['Lucas']
  },
  {
    id: '3',
    title: 'Clube do Livro',
    category: 'Encontros',
    location: 'Café Literário',
    date: '2025-06-19',
    time: '19:30',
    price: 'Gratuito',
    description: 'Neste mês, discutiremos "O Sol é para todos". Venha compartilhar suas ideias e tomar um café conosco.',
    imageUrl: 'https://images.pexels.com/photos/3747490/pexels-photo-3747490.jpeg',
    distance: '1.2km',
    friendsGoing: ['Juliana', 'Rafael'],
    participantsCount: 3,
    attendees: ['Juliana', 'Rafael', 'Gabriel']
  },
  {
    id: '4',
    title: 'Basquete',
    category: 'Esportes',
    location: 'Arena UNIFAA',
    date: '2025-06-14',
    time: '19:00',
    price: 'R$ 5',
    description: 'Jogo de basquete amistoso. Times serão formados na hora. Ótima oportunidade para praticar e conhecer novas pessoas.',
    imageUrl: 'https://images.pexels.com/photos/163452/basketball-dunk-blue-game-163452.jpeg',
    participantsCount: 3,
    attendees: ['Lucas', 'Gabriel', 'Anne']
  },
  {
    id: '5',
    title: 'Grupo de Estudos de React',
    category: 'Estudos',
    location: 'Biblioteca Central',
    date: '2025-06-18',
    time: '15:00',
    price: 'Gratuito',
    description: 'Vamos mergulhar nos hooks avançados do React e construir um mini-projeto juntos. Traga seu notebook!',
    imageUrl: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg',
    attendees: ['Mariana']
  },
  {
    id: '6',
    title: 'Aula de Empreendedorismo',
    category: 'Estudos',
    subtitle: 'Esta segunda-feira na UNIFAA',
    location: 'UNIFAA - Auditório B',
    date: '2025-06-16',
    time: '19:00',
    price: 'Gratuito',
    description: 'Uma aula especial para aprofundar os conceitos de empreendedorismo, com foco em modelos de negócio e pitchs. Imperdível para futuros gestores.',
    imageUrl: 'https://images.pexels.com/photos/1181622/pexels-photo-1181622.jpeg',
    isFeatured: true,
    createdBy: 'Anne',
    attendees: ['Anne', 'Gabriel', 'Mariana']
  }
];

export const USERS: User[] = [
  {
    id: '1',
    name: 'Lucas',
    email: 'lucas@example.com',
    avatarUrl: 'https://images.pexels.com/photos/3772510/pexels-photo-3772510.jpeg',
    bio: 'Apaixonado por esportes e sempre disposto a conhecer pessoas novas!',
    rating: 4.9,
    reviews: 87
  },
  {
    id: '2',
    name: 'Juliana',
    email: 'juliana@example.com',
    avatarUrl: 'https://images.pexels.com/photos/3775164/pexels-photo-3775164.jpeg',
    bio: 'Bookworm e coffee lover ☕📚',
    rating: 4.8,
    reviews: 124
  },
  {
    id: '3',
    name: 'Rafael',
    email: 'rafael@example.com',
    avatarUrl: 'https://images.pexels.com/photos/5378700/pexels-photo-5378700.jpeg',
    bio: 'Música, arte e boas conversas são minhas paixões',
    rating: 4.7,
    reviews: 156
  },
  {
    id: '4',
    name: 'Mariana',
    email: 'mariana@example.com',
    avatarUrl: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg',
    bio: 'Desenvolvedora front-end e eterna estudante',
    rating: 4.9,
    reviews: 92
  },
  {
    id: '5',
    name: 'Gabriel',
    email: 'gabriel@example.com',
    avatarUrl: 'https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg',
    bio: 'Empreendedor em formação, sempre em busca de networking',
    rating: 4.6,
    reviews: 68
  },
  {
    id: '6',
    name: 'Beatriz',
    email: 'beatriz@example.com',
    avatarUrl: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
    bio: 'Arte e cultura são minha vida!',
    rating: 4.8,
    reviews: 143
  }
];

export const CATEGORIES: Category[] = [
  { name: 'Esportes', icon: 'Dumbbell' },
  { name: 'Estudos', icon: 'Book' },
  { name: 'Eventos', icon: 'PartyPopper' },
  { name: 'Encontros', icon: 'Users' },
  { name: 'Jogos', icon: 'Gamepad2' },
  { name: 'Outro', icon: 'MoreHorizontal' }
];

export const BADGES: Badge[] = [
  { name: 'Organizador de Primeira', icon: 'Award', color: 'text-amber-500' },
  { name: 'Explorador', icon: 'Compass', color: 'text-emerald-500' },
  { name: 'Popular', icon: 'Users', color: 'text-sky-500' }
];

export const getCurrentUser = (): User => ({
  id: 'current',
  name: 'Anne Silva',
  email: 'anne@example.com',
  avatarUrl: '/src/assets/avatar-anne.jpg',
  location: 'Rio de Janeiro, RJ',
  bio: 'Estudante de administração, apaixonada por networking e novos desafios!',
  rating: 4.8,
  reviews: 152,
  interests: ['Administração', 'Networking', 'Esportes', 'Estudos'],
  badges: [
    { name: 'Organizadora de Primeira', icon: 'Award', color: 'text-amber-500' },
    { name: 'Exploradora', icon: 'Target', color: 'text-emerald-500' },
    { name: 'Popular', icon: 'Users', color: 'text-sky-500' },
    { name: 'Super Ativa', icon: 'Zap', color: 'text-purple-500' }
  ],
  eventsRegistered: [EVENTS[0], EVENTS[2], EVENTS[5]],
  eventsAttended: [EVENTS[1], EVENTS[3]],
  posts: [
    {
      id: '1',
      content: 'Que evento incrível foi o Festival de Música! Conheci pessoas maravilhosas e me diverti muito. Já estou ansiosa pelo próximo! 🎵',
      imageUrl: 'https://images.pexels.com/photos/1916817/pexels-photo-1916817.jpeg',
      createdAt: '2025-06-10',
      likes: 24,
      comments: 8
    },
    {
      id: '2',
      content: 'Começando minha jornada no empreendedorismo! A aula de hoje foi muito inspiradora. Quem mais está no mundo dos negócios aqui? 💼',
      createdAt: '2025-06-08',
      likes: 18,
      comments: 12
    }
  ],
  stories: [
    {
      id: '1',
      imageUrl: 'https://images.pexels.com/photos/3775164/pexels-photo-3775164.jpeg',
      createdAt: '2025-06-15T10:00:00Z',
      expiresAt: '2025-06-16T10:00:00Z'
    }
  ]
});