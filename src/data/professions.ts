export interface ProfessionItem {
  name: string;
  category: string;
}

export const PROFESSIONS_LIST: ProfessionItem[] = [
  // Comércio, Vendas e Atendimento
  { name: 'Vendedor(a)', category: 'Comércio e Vendas' },
  { name: 'Comerciante / Lojista', category: 'Comércio e Vendas' },
  { name: 'Representante Comercial', category: 'Comércio e Vendas' },
  { name: 'Promotor(a) de Vendas', category: 'Comércio e Vendas' },
  { name: 'Operador(a) de Caixa', category: 'Comércio e Vendas' },
  { name: 'Atendente / Balconista', category: 'Comércio e Vendas' },
  { name: 'Gerente de Loja', category: 'Comércio e Vendas' },
  { name: 'Consultor(a) de Vendas', category: 'Comércio e Vendas' },
  { name: 'Corretor(a) de Imóveis', category: 'Comércio e Vendas' },
  { name: 'Corretor(a) de Seguros', category: 'Comércio e Vendas' },

  // Autônomos, Empreendedores e MEI
  { name: 'Empresário(a) / Empreendedor(a)', category: 'Autônomos e Negócios' },
  { name: 'Microempreendedor Individual (MEI)', category: 'Autônomos e Negócios' },
  { name: 'Autônomo(a)', category: 'Autônomos e Negócios' },
  { name: 'Feirante / Ambulante', category: 'Autônomos e Negócios' },
  { name: 'Prestador(a) de Serviços', category: 'Autônomos e Negócios' },

  // Transporte e Logística
  { name: 'Motorista de Aplicativo (Uber / 99)', category: 'Transporte e Logística' },
  { name: 'Motorista Particular / Executivo', category: 'Transporte e Logística' },
  { name: 'Motorista de Caminhão / Caminhoneiro(a)', category: 'Transporte e Logística' },
  { name: 'Motorista de Ônibus / Van', category: 'Transporte e Logística' },
  { name: 'Motoboy / Entregador(a)', category: 'Transporte e Logística' },
  { name: 'Taxista', category: 'Transporte e Logística' },
  { name: 'Auxiliar de Logística / Estoque', category: 'Transporte e Logística' },
  { name: 'Conferente / Separador de Mercadorias', category: 'Transporte e Logística' },

  // Construção Civil e Manutenção
  { name: 'Pedreiro(a)', category: 'Construção e Manutenção' },
  { name: 'Servente / Ajudante de Obra', category: 'Construção e Manutenção' },
  { name: 'Mestre de Obras', category: 'Construção e Manutenção' },
  { name: 'Eletricista', category: 'Construção e Manutenção' },
  { name: 'Encanador(a) / Bombeiro Hidráulico', category: 'Construção e Manutenção' },
  { name: 'Pintor(a)', category: 'Construção e Manutenção' },
  { name: 'Marceneiro(a) / Carpinteiro(a)', category: 'Construção e Manutenção' },
  { name: 'Serralheiro(a) / Soldador(a)', category: 'Construção e Manutenção' },
  { name: 'Técnico(a) em Refrigeração / Ar-Condicionado', category: 'Construção e Manutenção' },
  { name: 'Mecânico(a) Automotivo', category: 'Construção e Manutenção' },
  { name: 'Funileiro(a) / Lanterneiro(a)', category: 'Construção e Manutenção' },
  { name: 'Borracheiro(a)', category: 'Construção e Manutenção' },
  { name: 'Jardineiro(a) / Paisagista', category: 'Construção e Manutenção' },

  // Saúde e Bem-Estar
  { name: 'Médico(a)', category: 'Saúde' },
  { name: 'Enfermeiro(a)', category: 'Saúde' },
  { name: 'Técnico(a) de Enfermagem', category: 'Saúde' },
  { name: 'Dentista / Odontólogo(a)', category: 'Saúde' },
  { name: 'Fisioterapeuta', category: 'Saúde' },
  { name: 'Psicólogo(a)', category: 'Saúde' },
  { name: 'Nutricionista', category: 'Saúde' },
  { name: 'Farmacêutico(a)', category: 'Saúde' },
  { name: 'Biomédico(a)', category: 'Saúde' },
  { name: 'Cuidador(a) de Idosos', category: 'Saúde' },
  { name: 'Personal Trainer / Educador Físico', category: 'Saúde' },
  { name: 'Veterinário(a)', category: 'Saúde' },

  // Beleza e Estética
  { name: 'Cabeleireiro(a) / Barbeiro(a)', category: 'Beleza e Estética' },
  { name: 'Manicure / Pedicure / Nail Designer', category: 'Beleza e Estética' },
  { name: 'Esteticista / Designer de Sobrancelhas', category: 'Beleza e Estética' },
  { name: 'Maquiador(a)', category: 'Beleza e Estética' },
  { name: 'Massoterapeuta', category: 'Beleza e Estética' },

  // Alimentação e Hospitalidade
  { name: 'Cozinheiro(a) / Chef de Cozinha', category: 'Alimentação' },
  { name: 'Auxiliar de Cozinha', category: 'Alimentação' },
  { name: 'Confeiteiro(a) / Boleiro(a)', category: 'Alimentação' },
  { name: 'Padeiro(a)', category: 'Alimentação' },
  { name: 'Açougueiro(a)', category: 'Alimentação' },
  { name: 'Garçom / Garçonete', category: 'Alimentação' },
  { name: 'Churrasqueiro(a) / Pizzaiolo(a)', category: 'Alimentação' },
  { name: 'Marmiteiro(a) / Dono(a) de Restaurante', category: 'Alimentação' },

  // Serviços Domésticos e Gerais
  { name: 'Diarista / Empregada Doméstica', category: 'Serviços Gerais' },
  { name: 'Auxiliar de Serviços Gerais / Limpeza', category: 'Serviços Gerais' },
  { name: 'Porteiro(a) / Zelador(a)', category: 'Serviços Gerais' },
  { name: 'Vigilante / Segurança Patrimonial', category: 'Serviços Gerais' },
  { name: 'Costureiro(a) / Alfaiate', category: 'Serviços Gerais' },
  { name: 'Babá', category: 'Serviços Gerais' },
  { name: 'Lavador(a) de Carros / Lava-Jato', category: 'Serviços Gerais' },

  // Administração, Escritório e Finanças
  { name: 'Auxiliar / Assistente Administrativo', category: 'Administração e Escritório' },
  { name: 'Recepcionista / Secretário(a)', category: 'Administração e Escritório' },
  { name: 'Contador(a) / Técnico Contábil', category: 'Administração e Escritório' },
  { name: 'Analista Financeiro(a)', category: 'Administração e Escritório' },
  { name: 'Analista de Recursos Humanos (RH)', category: 'Administração e Escritório' },
  { name: 'Operador(a) de Telemarketing', category: 'Administração e Escritório' },
  { name: 'Bancário(a)', category: 'Administração e Escritório' },
  { name: 'Gerente / Supervisor(a)', category: 'Administração e Escritório' },

  // Tecnologia, Marketing e Comunicação
  { name: 'Desenvolvedor(a) / Programador(a)', category: 'Tecnologia e Marketing' },
  { name: 'Analista de Sistemas / TI', category: 'Tecnologia e Marketing' },
  { name: 'Técnico(a) em Informática / Manutenção de Celulares', category: 'Tecnologia e Marketing' },
  { name: 'Designer Gráfico / Social Media', category: 'Tecnologia e Marketing' },
  { name: 'Fotógrafo(a) / Videomaker', category: 'Tecnologia e Marketing' },
  { name: 'Influenciador(a) Digital / Criador de Conteúdo', category: 'Tecnologia e Marketing' },

  // Educação
  { name: 'Professor(a)', category: 'Educação' },
  { name: 'Pedagogo(a)', category: 'Educação' },
  { name: 'Instrutor(a) de Autoescola', category: 'Educação' },

  // Jurídico e Setor Público
  { name: 'Advogado(a)', category: 'Direito e Setor Público' },
  { name: 'Servidor(a) Público(a)', category: 'Direito e Setor Público' },
  { name: 'Policial / Militar / Guarda Municipal', category: 'Direito e Setor Público' },
  { name: 'Bombeiro(a)', category: 'Direito e Setor Público' },

  // Indústria, Engenharia e Agronegócio
  { name: 'Operador(a) de Produção / Fábrica', category: 'Indústria e Agro' },
  { name: 'Operador(a) de Máquinas / Empilhadeira', category: 'Indústria e Agro' },
  { name: 'Engenheiro(a)', category: 'Indústria e Agro' },
  { name: 'Arquiteto(a)', category: 'Indústria e Agro' },
  { name: 'Produtor(a) Rural / Agricultor(a)', category: 'Indústria e Agro' },

  // Previdência e Outros
  { name: 'Aposentado(a)', category: 'Previdência e Outros' },
  { name: 'Pensionista', category: 'Previdência e Outros' },
  { name: 'Estudante / Estagiário(a)', category: 'Previdência e Outros' },
  { name: 'Outra Profissão', category: 'Previdência e Outros' },
];
