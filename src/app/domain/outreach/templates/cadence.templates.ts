import type { OutreachStage } from '../types';
import { pickVariation } from '../variation';

export const CADENCE_TEMPLATES: Record<OutreachStage, readonly string[]> = {
  m1a_permissao: [
    `Fala, {{primeiro_nome}}! Beleza?

Aqui é o Paulo, sou dev web aqui de Niterói.

Achei a {{nome}} no Google{{#se tem_reputacao}} — {{nota}} com {{avaliacoes}} avaliações, vocês tão bem avaliados demais{{/se}}.

Reparei que vocês não têm site. Montei uma página de exemplo, sem compromisso e sem cobrar nada.

Posso te mandar pra você dar uma olhada?`,
    `Oi, {{primeiro_nome}}! Tudo certo?

Paulo aqui, trabalho com site pra {{setor}}.

Vi a {{nome}} no Google{{#se tem_reputacao}} e a nota de vocês ({{nota}}, {{avaliacoes}} avaliações) chamou atenção{{/se}}.

Fiz uma página de exemplo pra vocês por conta própria, só pra mostrar como ficaria.

Quer ver?`,
  ],
  m1b_direto: [
    `Fala, {{primeiro_nome}}! Aqui é o Paulo, dev de Niterói.

Vi a {{nome}} no Google e montei uma página de exemplo pra vocês:

{{preview_url}}

Usei as fotos e as avaliações reais de vocês. Abre no celular que fica melhor.

Se não fizer sentido, é só ignorar 👍`,
    `Oi, {{primeiro_nome}}! Paulo aqui, dev web.

Encontrei a {{nome}} procurando {{setor}} em {{bairro}} e resolvi montar isso aqui:

{{preview_url}}

É exemplo mesmo, sem compromisso. Dá uma olhada no celular.

Se não for pra vocês, sem problema nenhum 👍`,
  ],
  m2_preview: [
    `Show, olha aí:

{{preview_url}}

Fiz com as fotos e as avaliações de vocês mesmo, não é template genérico.

O botão de agendar abre direto no WhatsApp de vocês.

Dá uma olhada no celular e me fala: o que você mudaria?`,
  ],
  m3_descoberta: [
    `Boa! Deixa eu te perguntar uma coisa: hoje cliente novo chega mais por indicação ou pelo Instagram?`,
    `Anotado! Só uma curiosidade: quando aparece cliente novo aí, geralmente é indicação de alguém ou achou vocês na internet?`,
  ],
  m4_proposta: [
    `Esse que te mandei é o Essencial: R$ 650, pronto em 7 dias.

Vai com domínio próprio, botão de WhatsApp, Google Maps e otimizado pra aparecer quando alguém buscar {{setor}} em {{bairro}}.

Metade pra começar, metade na entrega.

Tem versão com galeria, página de serviços e agendamento também, mas pro que vocês precisam agora o Essencial resolve.`,
  ],
  f1_d2: [
    `{{primeiro_nome}}, ajustei a página: coloquei os horários e a localização de vocês.

{{preview_url}}`,
  ],
  f2_d5: [
    `Fala {{primeiro_nome}}, só pra não deixar em aberto: faz sentido pra vocês ou deixo quieto?`,
  ],
  f3_d12: [
    `{{primeiro_nome}}, vou tirar a página do ar semana que vem.

Se quiser que eu deixe no ar, me avisa. Qualquer coisa no futuro tô por aqui 👍`,
  ],
};

export function getCadenceTemplate(stage: OutreachStage, leadId: string): string {
  return pickVariation(CADENCE_TEMPLATES[stage], leadId);
}
