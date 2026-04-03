import { ArrowLeft, FileText, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BrandLogo } from '@/components/BrandLogo';
import { useEffect, useRef } from 'react';

const LegalPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const privacyRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (location.hash === '#privacidade' && privacyRef.current) {
      privacyRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <BrandLogo size="sm" />
          <span className="text-sm font-medium text-muted-foreground">Documentos Legais</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Quick nav */}
        <nav className="flex gap-3">
          <a href="#termos" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <FileText className="w-4 h-4" /> Termos de Uso
          </a>
          <a href="#privacidade" className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
            <Shield className="w-4 h-4" /> Política de Privacidade
          </a>
        </nav>

        {/* Meta */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Termos de Uso e Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">Versão 1.0 · Última atualização: 28 de março de 2026</p>
        </div>

        <Separator />

        {/* ===== TERMOS DE USO ===== */}
        <section id="termos" className="space-y-6 scroll-mt-20">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Termos de Uso
          </h2>

          <Section title="1. Identificação e Qualificação">
            <p>Este instrumento regula o uso da plataforma digital Juntoo, operada por [RAZÃO SOCIAL DA EMPRESA], pessoa jurídica de direito privado, inscrita no CNPJ sob nº [●], com sede em [●], doravante denominada "Juntoo".</p>
            <p>O Juntoo atua como:</p>
            <ul>
              <li>Provedor de Aplicação de Internet (Lei nº 12.965/2014);</li>
              <li>Controlador de Dados Pessoais (Lei nº 13.709/2018).</li>
            </ul>
          </Section>

          <Section title="2. Aceitação, Consentimento e Vinculação Jurídica">
            <p><strong>2.1.</strong> O aceite destes Termos constitui:</p>
            <ul>
              <li>Contrato eletrônico vinculante;</li>
              <li>Manifestação inequívoca de vontade;</li>
              <li>Concordância com tratamento de dados.</li>
            </ul>
            <p><strong>2.2.</strong> O usuário declara:</p>
            <ul>
              <li>Possuir capacidade legal plena;</li>
              <li>Compreender integralmente os riscos da plataforma;</li>
              <li>Agir por sua própria responsabilidade.</li>
            </ul>
          </Section>

          <Section title="3. Natureza da Plataforma e Limitação Estrutural">
            <p><strong>3.1.</strong> O Juntoo é uma infraestrutura tecnológica de conexão social, não sendo:</p>
            <ul>
              <li>Organizador de eventos;</li>
              <li>Garantidor de segurança física;</li>
              <li>Prestador de serviços presenciais.</li>
            </ul>
            <p><strong>3.2.</strong> O Juntoo não participa da execução de encontros, limitando-se à intermediação digital.</p>
          </Section>

          <Section title="4. Alocação de Risco">
            <p><strong>4.1.</strong> O usuário reconhece que:</p>
            <ul>
              <li>A plataforma envolve interação com terceiros desconhecidos;</li>
              <li>Existem riscos inerentes a encontros presenciais;</li>
              <li>Tais riscos são assumidos integralmente pelo usuário.</li>
            </ul>
            <p><strong>4.2.</strong> O usuário concorda em utilizar a plataforma sob sua exclusiva responsabilidade.</p>
          </Section>

          <Section title="5. Waiver Expresso de Responsabilidade">
            <p>O usuário, de forma livre e consciente, <strong>renuncia expressamente</strong> a qualquer reivindicação contra o Juntoo decorrente do uso da plataforma.</p>
          </Section>

          <Section title="6. Limitação Máxima de Responsabilidade">
            <p>Na máxima extensão permitida pela legislação:</p>
            <p><strong>6.1.</strong> O Juntoo não será responsável por:</p>
            <ul>
              <li>Danos indiretos ou consequenciais;</li>
              <li>Lucros cessantes;</li>
              <li>Perda de dados.</li>
            </ul>
            <p><strong>6.2.</strong> Limite financeiro absoluto — responsabilidade limitada a:</p>
            <ul>
              <li>(i) R$ 100,00; ou</li>
              <li>(ii) valor pago nos últimos 12 meses.</li>
            </ul>
            <p><strong>6.3.</strong> Essa limitação aplica-se inclusive em casos de negligência, falhas técnicas e indisponibilidade da plataforma.</p>
          </Section>

          <Section title="7. Cláusula de Indenização (Hold Harmless)">
            <p>O usuário concorda em defender, indenizar e isentar o Juntoo de qualquer reclamação decorrente de:</p>
            <ul>
              <li>Uso da plataforma;</li>
              <li>Violação destes Termos;</li>
              <li>Danos causados a terceiros.</li>
            </ul>
          </Section>

          <Section title="8. Arbitragem Obrigatória e Renúncia a Ação Coletiva">
            <p><strong>8.1.</strong> Qualquer disputa será resolvida por arbitragem, nos termos da Lei nº 9.307/96.</p>
            <p><strong>8.2.</strong> O usuário concorda com:</p>
            <ul>
              <li>Renúncia a processo judicial comum (salvo exceções legais);</li>
              <li>Renúncia à participação em ações coletivas.</li>
            </ul>
            <p><strong>8.3.</strong> A arbitragem será individual, confidencial e conduzida por câmara arbitral escolhida pelo Juntoo.</p>
          </Section>

          <Section title="9. Compliance, KYC e Verificação de Usuários">
            <p>O Juntoo poderá implementar:</p>
            <ul>
              <li>Verificação de identidade (KYC);</li>
              <li>Validação documental;</li>
              <li>Análise comportamental;</li>
              <li>Cruzamento de dados antifraude.</li>
            </ul>
            <p>O usuário concorda com tais procedimentos.</p>
          </Section>

          <Section title="10. Sistema de Moderação e Governança">
            <p>O Juntoo poderá monitorar atividades, remover conteúdos e suspender contas.</p>
            <p>Decisões poderão ser baseadas em:</p>
            <ul>
              <li>Algoritmos;</li>
              <li>Inteligência artificial;</li>
              <li>Denúncias;</li>
              <li>Análise interna.</li>
            </ul>
          </Section>

          <Section title="11. Conteúdo do Usuário">
            <p>O usuário é integralmente responsável pelo conteúdo publicado.</p>
            <p>Concede ao Juntoo licença global, irrevogável, gratuita e sublicenciável para uso do conteúdo na plataforma.</p>
          </Section>

          <Section title="12. Restrição de Idade">
            <p><strong>12.1.</strong> A utilização do Juntoo é restrita a pessoas com <strong>18 (dezoito) anos de idade ou mais</strong>.</p>
            <p><strong>12.2.</strong> Ao cadastrar-se, o usuário declara expressamente possuir a idade mínima exigida.</p>
            <p><strong>12.3.</strong> O Juntoo reserva-se o direito de solicitar comprovação de idade a qualquer momento e encerrar contas de usuários menores de 18 anos.</p>
            <p><strong>12.4.</strong> Caso seja constatada a falsidade da declaração de idade, o usuário poderá ter sua conta suspensa ou banida permanentemente, sem direito a reembolso ou indenização.</p>
          </Section>

          <Section title="13. Responsabilidade em Encontros Presenciais">
            <p><strong>13.1.</strong> O Juntoo é exclusivamente uma plataforma de intermediação digital. Não organiza, supervisiona ou participa de encontros presenciais entre usuários.</p>
            <p><strong>13.2.</strong> O usuário reconhece que:</p>
            <ul>
              <li>Encontros presenciais são de sua inteira responsabilidade;</li>
              <li>Deve tomar precauções de segurança pessoal (avisar terceiros, escolher locais públicos, etc.);</li>
              <li>O Juntoo não garante a identidade, intenção ou conduta de outros usuários;</li>
              <li>Qualquer dano, prejuízo ou incidente decorrente de encontros presenciais não será de responsabilidade do Juntoo.</li>
            </ul>
            <p><strong>13.3.</strong> O Juntoo disponibiliza ferramentas de segurança (denúncias, verificação de identidade, sistema de reputação) como medida de boa-fé, sem que isso constitua garantia de segurança.</p>
          </Section>

          <Section title="14. Canal de Contato e Suporte">
            <p>O usuário pode entrar em contato com o Juntoo através de:</p>
            <ul>
              <li>Canal de suporte integrado ao aplicativo (Configurações → Ajuda e Suporte);</li>
              <li>E-mail: <strong>contato@juntoo.com.br</strong></li>
            </ul>
            <p>O Juntoo compromete-se a responder solicitações em até 15 (quinze) dias úteis.</p>
          </Section>
        </section>

        <Separator />

        {/* ===== POLÍTICA DE PRIVACIDADE ===== */}
        <section id="privacidade" ref={privacyRef} className="space-y-6 scroll-mt-20">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Política de Privacidade
          </h2>

          <Section title="15. Privacidade e Proteção de Dados">
            <p>O tratamento de dados observa a legislação do Brasil, especialmente a LGPD (Lei nº 13.709/2018).</p>
          </Section>

          <Section title="16. Finalidades do Tratamento">
            <ul>
              <li>Funcionamento da plataforma;</li>
              <li>Segurança;</li>
              <li>Prevenção de fraudes;</li>
              <li>Melhoria do serviço;</li>
              <li>Cumprimento legal.</li>
            </ul>
          </Section>

          <Section title="17. Bases Legais">
            <ul>
              <li>Execução de contrato;</li>
              <li>Legítimo interesse;</li>
              <li>Consentimento;</li>
              <li>Obrigação legal.</li>
            </ul>
          </Section>

          <Section title="15. Compartilhamento de Dados">
            <p>Com:</p>
            <ul>
              <li>Provedores tecnológicos;</li>
              <li>Parceiros estratégicos;</li>
              <li>Autoridades legais.</li>
            </ul>
          </Section>

          <Section title="16. Transferência Internacional">
            <p>Os dados poderão ser transferidos para o exterior com salvaguardas adequadas.</p>
          </Section>

          <Section title="17. Segurança da Informação">
            <p>Medidas incluem:</p>
            <ul>
              <li>Criptografia avançada;</li>
              <li>Controle de acesso;</li>
              <li>Monitoramento contínuo.</li>
            </ul>
          </Section>

          <Section title="18. Retenção de Dados">
            <p>Dados serão mantidos conforme:</p>
            <ul>
              <li>Necessidade operacional;</li>
              <li>Obrigação legal;</li>
              <li>Defesa judicial.</li>
            </ul>
          </Section>

          <Section title="19. Direitos do Titular">
            <p>O usuário poderá exercer seus direitos via e-mail de privacidade do Juntoo, incluindo:</p>
            <ul>
              <li>Acesso aos dados;</li>
              <li>Correção de dados incompletos;</li>
              <li>Portabilidade;</li>
              <li>Eliminação;</li>
              <li>Revogação de consentimento.</li>
            </ul>
          </Section>

          <Section title="20. Incidentes de Segurança">
            <p>O Juntoo adotará medidas imediatas e notificará autoridades e usuários quando necessário.</p>
          </Section>

          <Section title="21. Suspensão e Encerramento">
            <p>O Juntoo poderá encerrar contas sem aviso prévio em caso de risco ou violação.</p>
          </Section>

          <Section title="22. Alterações dos Termos">
            <p>Os Termos poderão ser atualizados a qualquer tempo. O uso continuado da plataforma após alterações constitui aceite das novas condições.</p>
          </Section>

          <Section title="23. Legislação e Foro">
            <p>Regido pelas leis do Brasil. Foro da comarca de [●] para questões não submetidas à arbitragem.</p>
          </Section>
        </section>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
          <p>Você também pode <a href="/termos-de-uso-e-politica-de-privacidade.pdf" target="_blank" rel="noopener noreferrer" className="text-primary underline">baixar o PDF completo</a>.</p>
          <p>© {new Date().getFullYear()} Juntoo. Todos os direitos reservados.</p>
        </div>
      </main>
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:text-sm">
        {children}
      </div>
    </div>
  );
}

export default LegalPage;
