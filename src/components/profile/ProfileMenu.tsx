/**
 * Menu de 3 pontos no perfil de outro usuário.
 * Opções: Denunciar perfil / Bloquear (remover amizade existente).
 */
import { useState } from 'react';
import { MoreVertical, Flag, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ReportModal } from '@/components/reports/ReportModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProfileMenuProps {
  targetUserId: string;
  targetName: string;
  onBlocked?: () => void;
}

export const ProfileMenu = ({ targetUserId, targetName, onBlocked }: ProfileMenuProps) => {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);

  const handleBlock = async () => {
    if (!user) {
      toast.error('Faça login para bloquear usuários.');
      return;
    }

    try {
      // Remove qualquer amizade existente entre os dois usuários
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`
        );

      if (error) throw error;

      toast.success(`${targetName} foi bloqueado(a). Você não verá mais essa pessoa.`);
      onBlocked?.();
    } catch (err) {
      console.error('Error blocking user:', err);
      toast.error('Não foi possível bloquear agora. Tente novamente.');
    } finally {
      setConfirmBlockOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-popover">
          <DropdownMenuItem
            onClick={() => setReportOpen(true)}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Flag className="w-4 h-4 mr-2" />
            Denunciar perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmBlockOpen(true)}
            className="cursor-pointer"
          >
            <UserX className="w-4 h-4 mr-2" />
            Bloquear usuário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedUserId={targetUserId}
        contextLabel={`Denunciar perfil: ${targetName}`}
      />

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear {targetName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você deixará de ver essa pessoa no app e ela não poderá enviar mensagens diretas. Você pode desfazer depois enviando uma nova solicitação de amizade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock}>Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
