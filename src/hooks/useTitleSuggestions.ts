import { useMemo } from 'react';
import { Category } from '@/constants/categories';

const TITLE_SUGGESTIONS: Record<string, string[]> = {
  'Esportes': [
    'Futebol no parque',
    'Vôlei de praia',
    'Corrida matinal',
    'Basquete no ginásio',
    'Pedal no fim de semana',
  ],
  'Música': [
    'Jam session no bar',
    'Roda de samba',
    'Show ao vivo',
    'Ensaio aberto da banda',
    'Karaokê com amigos',
  ],
  'Arte': [
    'Ateliê de pintura',
    'Exposição coletiva',
    'Workshop de cerâmica',
    'Encontro de artistas',
  ],
  'Tecnologia': [
    'Meetup de devs',
    'Hackathon relâmpago',
    'Workshop de IA',
    'Palestra sobre startups',
  ],
  'Culinária': [
    'Aula de culinária japonesa',
    'Churrasquinho no domingo',
    'Degustação de vinhos',
    'Pizza com amigos',
  ],
  'Viagem': [
    'Trilha no fim de semana',
    'Road trip litoral',
    'Camping na serra',
    'Passeio cultural pelo centro',
  ],
  'Fotografia': [
    'Saída fotográfica urbana',
    'Workshop de retrato',
    'Fotowalk ao pôr do sol',
  ],
  'Leitura': [
    'Clube do livro mensal',
    'Troca de livros no café',
    'Roda de leitura ao ar livre',
  ],
  'Cinema': [
    'Sessão pipoca em casa',
    'Maratona de filmes',
    'Cineclube ao ar livre',
  ],
  'Dança': [
    'Aula de salsa para iniciantes',
    'Forró no pé',
    'Roda de dança urbana',
  ],
  'Natureza': [
    'Trilha ecológica',
    'Piquenique no parque',
    'Observação de aves',
  ],
  'Fitness': [
    'Treino funcional no parque',
    'Yoga ao amanhecer',
    'CrossFit em grupo',
  ],
  'Educação': [
    'Grupo de estudos',
    'Palestra aberta',
    'Workshop gratuito',
  ],
  'Social': [
    'Happy hour no centro',
    'Encontro de amigos',
    'Confraternização de bairro',
  ],
  'Negócios': [
    'Networking profissional',
    'Café com empreendedores',
    'Pitch night',
  ],
  'Jogos': [
    'Noite de board games',
    'Torneio de videogame',
    'RPG de mesa',
  ],
  'Outro': [
    'Evento comunitário',
    'Encontro especial',
    'Atividade em grupo',
  ],
};

export function useTitleSuggestions(category: string, currentTitle: string) {
  return useMemo(() => {
    if (!category) return [];
    const suggestions = TITLE_SUGGESTIONS[category] || TITLE_SUGGESTIONS['Outro'];
    if (!currentTitle || currentTitle.length < 1) return suggestions;
    const lower = currentTitle.toLowerCase();
    return suggestions.filter(s => s.toLowerCase().includes(lower) && s.toLowerCase() !== lower);
  }, [category, currentTitle]);
}
