alter table public.leads
  drop constraint if exists leads_sector_check;

alter table public.leads
  add constraint leads_sector_check check (sector in (
    'Clínicas & Consultórios',
    'Clínicas de Estética',
    'Clínicas Veterinárias & Pet',
    'Psicólogos & Terapeutas',
    'Fisioterapia & Pilates',
    'Odontologia',
    'Salões & Barbearias',
    'Salões Femininos',
    'Nail Designers',
    'Estúdios de Tatuagem',
    'Restaurantes',
    'Lanchonetes & Hamburguerias',
    'Padarias & Confeitarias',
    'Marmitarias & Delivery',
    'Oficinas Mecânicas',
    'Academias & Estúdios',
    'Fotógrafos & Estúdios',
    'Serviços Domésticos',
    'Advocacia',
    'Contabilidade',
    'Escolas & Cursos',
    'Igrejas & Ministérios'
  ));
