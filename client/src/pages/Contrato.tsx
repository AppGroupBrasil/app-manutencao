import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Printer,
  Share2,
  Copy,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { Link } from "wouter";

const PLANOS = [
  { id: "individual", nome: "Individual", usuarios: 1, valor: 99 },
  { id: "pequenas", nome: "Pequenas Equipes", usuarios: 3, valor: 199 },
  { id: "medias", nome: "Equipes Médias", usuarios: 5, valor: 299 },
];

const EMPRESA = {
  nome: "APP GROUP LTDA",
  cnpj: "51.797.070/0001-53",
  endereco: "Avenida Paulista, 1106 - Sala 01 - Andar 16",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01.310-914",
  email: "abertura@contabilizei.com.br",
  telefone: "(41) 9888-0068",
};

export default function Contrato() {
  const [formData, setFormData] = useState({
    nomeCliente: "",
    cnpjCliente: "",
    enderecoCliente: "",
    plano: "",
    dataInicio: new Date().toISOString().split("T")[0],
    dataContrato: new Date().toISOString().split("T")[0],
    localContrato: "São Paulo - SP",
    nomeResponsavel: "",
    cpfResponsavel: "",
    cargoResponsavel: "",
  });

  const [mostrarContrato, setMostrarContrato] = useState(false);
  const contratoRef = useRef<HTMLDivElement>(null);

  const planoSelecionado = PLANOS.find((p) => p.id === formData.plano);
  const valorMensal = planoSelecionado?.valor || 0;
  const valorAnual = valorMensal * 12;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanChange = (value: string) => {
    setFormData((prev) => ({ ...prev, plano: value }));
  };

  const handleGerarPDF = async () => {
    if (!contratoRef.current) return;
    const { default: html2pdf } = await import("html2pdf.js");
    const element = contratoRef.current;
    const opt: any = {
      margin: 10,
      filename: `contrato-${formData.nomeCliente || "app-manutencao"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };
    (html2pdf() as any).set(opt).from(element).save();
  };

  const handleImprimir = () => {
    if (!contratoRef.current) return;
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(
        "<html><head><title>Contrato</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; }</style></head><body>"
      );
      printWindow.document.write(contratoRef.current.innerHTML);
      printWindow.document.write("</body></html>");
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCopiarLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado para a área de transferência!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleCompartilhar = async () => {
    const url = window.location.href;
    const text = `Contrato App Manutenção - ${formData.nomeCliente}\n${url}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch { /* clipboard not available */ }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("Link copiado! WhatsApp aberto para envio.");
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-12">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Contrato de Serviço</h1>
          <div className="w-20" />
        </div>

        {!mostrarContrato ? (
          // Formulário
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardTitle>Preencha os dados para gerar seu contrato</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Dados do Cliente</h3>
                  <p className="text-sm text-blue-800">Preencha as informações da empresa que está contratando o serviço</p>
                </div>

                {/* Nome do Cliente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    name="nomeCliente"
                    value={formData.nomeCliente}
                    onChange={handleInputChange}
                    placeholder="Ex: Empresa XYZ LTDA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* CNPJ do Cliente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CNPJ da Empresa *
                  </label>
                  <input
                    type="text"
                    name="cnpjCliente"
                    value={formData.cnpjCliente}
                    onChange={handleInputChange}
                    placeholder="Ex: 12.345.678/0001-90"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Endereço do Cliente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Endereço Completo da Empresa *
                  </label>
                  <input
                    type="text"
                    name="enderecoCliente"
                    value={formData.enderecoCliente}
                    onChange={handleInputChange}
                    placeholder="Ex: Rua das Flores, 123, Apto 456, Centro"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Seleção de Plano */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Selecione o Plano *
                  </label>
                  <Select value={formData.plano} onValueChange={handlePlanChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Escolha um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLANOS.map((plano) => (
                        <SelectItem key={plano.id} value={plano.id}>
                          {plano.nome} - {plano.usuarios} usuário(s) - R${plano.valor}/mês
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data de Início */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Data de Início do Serviço *
                  </label>
                  <input
                    type="date"
                    name="dataInicio"
                    value={formData.dataInicio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-6">
                  <h3 className="font-semibold text-green-900 mb-2">Dados do Responsável</h3>
                  <p className="text-sm text-green-800">Informações de quem está assinando o contrato</p>
                </div>

                {/* Nome do Responsável */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome Completo do Responsável *
                  </label>
                  <input
                    type="text"
                    name="nomeResponsavel"
                    value={formData.nomeResponsavel}
                    onChange={handleInputChange}
                    placeholder="Ex: João Silva Santos"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* CPF do Responsável */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CPF do Responsável *
                  </label>
                  <input
                    type="text"
                    name="cpfResponsavel"
                    value={formData.cpfResponsavel}
                    onChange={handleInputChange}
                    placeholder="Ex: 123.456.789-00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Cargo do Responsável */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cargo que Ocupa *
                  </label>
                  <input
                    type="text"
                    name="cargoResponsavel"
                    value={formData.cargoResponsavel}
                    onChange={handleInputChange}
                    placeholder="Ex: Diretor, Gerente, Administrador"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 my-6">
                  <h3 className="font-semibold text-purple-900 mb-2">Data e Local do Contrato</h3>
                  <p className="text-sm text-purple-800">Informações sobre quando e onde o contrato está sendo celebrado</p>
                </div>

                {/* Data do Contrato */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Data do Contrato *
                  </label>
                  <input
                    type="date"
                    name="dataContrato"
                    value={formData.dataContrato}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Local do Contrato */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Local do Contrato *
                  </label>
                  <input
                    type="text"
                    name="localContrato"
                    value={formData.localContrato}
                    onChange={handleInputChange}
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Resumo do Contrato */}
                {formData.nomeCliente && formData.plano && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 mt-8">
                    <h3 className="font-bold text-gray-900 mb-3">Resumo do Contrato</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Empresa Contratante:</strong> {formData.nomeCliente}
                      </p>
                      <p>
                        <strong>CNPJ:</strong> {formData.cnpjCliente}
                      </p>
                      <p>
                        <strong>Responsável:</strong> {formData.nomeResponsavel} ({formData.cargoResponsavel})
                      </p>
                      <p>
                        <strong>Plano:</strong> {planoSelecionado?.nome}
                      </p>
                      <p>
                        <strong>Usuários:</strong> {planoSelecionado?.usuarios}
                      </p>
                      <p>
                        <strong>Valor Mensal:</strong> R$ {valorMensal.toFixed(2)}
                      </p>
                      <p>
                        <strong>Valor Anual:</strong> R$ {valorAnual.toFixed(2)}
                      </p>
                      <p>
                        <strong>Data de Início:</strong> {formatarData(formData.dataInicio)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => setMostrarContrato(true)}
                    disabled={
                      !formData.nomeCliente ||
                      !formData.cnpjCliente ||
                      !formData.enderecoCliente ||
                      !formData.plano ||
                      !formData.nomeResponsavel ||
                      !formData.cpfResponsavel ||
                      !formData.cargoResponsavel
                    }
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-lg py-6"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Visualizar Contrato
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Visualização do Contrato
          <div className="space-y-6">
            {/* Botões de Ação */}
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={() => setMostrarContrato(false)}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Editar
              </Button>
              <Button
                onClick={handleImprimir}
                variant="outline"
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                onClick={handleGerarPDF}
                className="bg-red-500 hover:bg-red-600 text-white gap-2"
              >
                <Download className="w-4 h-4" />
                Gerar PDF
              </Button>
              <Button
                onClick={handleCopiarLink}
                className="bg-gray-500 hover:bg-gray-600 text-white gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Link
              </Button>
              <Button
                onClick={handleCompartilhar}
                className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </div>

            {/* Contrato */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12">
                <div ref={contratoRef} className="space-y-6 text-sm leading-relaxed">
                  {/* Cabeçalho */}
                  <div className="text-center border-b-2 border-gray-300 pb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                    </h1>
                    <p className="text-gray-600">
                      Plataforma de Gestão de Manutenção - App Manutenção
                    </p>
                  </div>

                  {/* Data e Local */}
                  <div className="text-center text-xs">
                    <p>
                      Celebrado em {formatarData(formData.dataContrato)}, em {formData.localContrato}
                    </p>
                  </div>

                  {/* Dados da Empresa Prestadora */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="font-bold text-gray-900 mb-3">
                      1. PARTES CONTRATANTES
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          CONTRATANTE (PRESTADORA DE SERVIÇOS):
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs ml-4">
                          <p>
                            <strong>Empresa:</strong> {EMPRESA.nome}
                          </p>
                          <p>
                            <strong>CNPJ:</strong> {EMPRESA.cnpj}
                          </p>
                          <p className="col-span-2">
                            <strong>Endereço:</strong> {EMPRESA.endereco}
                          </p>
                          <p>
                            <strong>Bairro:</strong> {EMPRESA.bairro}
                          </p>
                          <p>
                            <strong>Cidade:</strong> {EMPRESA.cidade}, {EMPRESA.estado}
                          </p>
                          <p>
                            <strong>CEP:</strong> {EMPRESA.cep}
                          </p>
                          <p>
                            <strong>Email:</strong> {EMPRESA.email}
                          </p>
                          <p>
                            <strong>Telefone:</strong> {EMPRESA.telefone}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-300 pt-4">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          CONTRATADO (CLIENTE):
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs ml-4">
                          <p>
                            <strong>Empresa:</strong> {formData.nomeCliente}
                          </p>
                          <p>
                            <strong>CNPJ:</strong> {formData.cnpjCliente}
                          </p>
                          <p className="col-span-2">
                            <strong>Endereço:</strong> {formData.enderecoCliente}
                          </p>
                          <p className="col-span-2">
                            <strong>Responsável:</strong> {formData.nomeResponsavel}
                          </p>
                          <p>
                            <strong>CPF:</strong> {formData.cpfResponsavel}
                          </p>
                          <p>
                            <strong>Cargo:</strong> {formData.cargoResponsavel}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Objeto do Contrato */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      2. OBJETO DO CONTRATO
                    </h2>
                    <p className="text-justify">
                      A {EMPRESA.nome} se compromete a fornecer acesso à plataforma
                      de gestão de manutenção "App Manutenção", incluindo funcionalidades de ordens de serviço, vistorias, checklists,
                      relatórios profissionais, aplicativo mobile e suporte técnico, conforme especificado no plano contratado.
                    </p>
                  </div>

                  {/* Plano Contratado */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      3. PLANO CONTRATADO
                    </h2>
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg space-y-2 text-xs">
                      <p>
                        <strong>Plano:</strong> {planoSelecionado?.nome}
                      </p>
                      <p>
                        <strong>Número de Usuários:</strong> {planoSelecionado?.usuarios}
                      </p>
                      <p>
                        <strong>Valor Mensal:</strong> R$ {valorMensal.toFixed(2)}
                      </p>
                      <p>
                        <strong>Valor Anual (12 meses):</strong> R$ {valorAnual.toFixed(2)}
                      </p>
                      <p>
                        <strong>Data de Início:</strong> {formatarData(formData.dataInicio)}
                      </p>
                    </div>
                  </div>

                  {/* Condições de Pagamento */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      4. CONDIÇÕES DE PAGAMENTO
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-justify ml-2">
                      <li>
                        O pagamento deverá ser realizado mensalmente, conforme fatura emitida pela prestadora de serviços.
                      </li>
                      <li>
                        Sem taxa de adesão ou taxa inicial. Acesso imediato após confirmação do pagamento.
                      </li>
                      <li>
                        As formas de pagamento aceitas são: Boleto bancário, Cartão de Crédito e Pix.
                      </li>
                      <li>
                        O sistema será bloqueado automaticamente após 5 (cinco) dias corridos de atraso no pagamento.
                      </li>
                      <li>
                        Após o bloqueio, será necessário regularizar o pagamento para reativação do acesso.
                      </li>
                    </ul>
                  </div>

                  {/* Vigência e Renovação */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      5. VIGÊNCIA E RENOVAÇÃO
                    </h2>
                    <p className="text-justify mb-3">
                      Este contrato terá vigência inicial de 1 (um) ano, contado a partir da data de início especificada acima.
                    </p>
                    <p className="text-justify mb-3">
                      Após o término do período inicial, o contrato será automaticamente renovado por iguais períodos de 1 (um) ano,
                      sucessivamente, até que uma das partes manifeste sua intenção de não renovação, mediante aviso prévio de 30 (trinta) dias
                      antes do término da vigência.
                    </p>
                    <p className="text-justify">
                      Na ausência de manifestação contrária, presume-se a vontade de ambas as partes em dar continuidade ao contrato.
                    </p>
                  </div>

                  {/* Reajuste */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      6. REAJUSTE DE VALORES
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-justify ml-2">
                      <li>
                        Os valores poderão ser reajustados anualmente, conforme variação do Índice Nacional de Preços ao Consumidor Amplo (IPCA),
                        ou outro índice que venha a substituí-lo.
                      </li>
                      <li>
                        A prestadora de serviços notificará o cliente com antecedência mínima de 30 (trinta) dias sobre qualquer reajuste de valores.
                      </li>
                      <li>
                        O cliente terá o direito de aceitar o novo valor ou rescindir o contrato sem penalidades, desde que comunique sua decisão
                        dentro de 15 (quinze) dias após receber a notificação.
                      </li>
                    </ul>
                  </div>

                  {/* Cancelamento */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      7. CANCELAMENTO E RESCISÃO
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">Cancelamento por Iniciativa do Cliente:</p>
                        <ul className="list-disc list-inside space-y-1 text-justify ml-4">
                          <li>
                            O cliente poderá cancelar este contrato a qualquer momento, sem multas ou penalidades, desde que comunique sua intenção
                            com aviso prévio de 30 (trinta) dias corridos.
                          </li>
                          <li>
                            Caso o cliente não respeite o aviso prévio de 30 dias, será cobrada uma mensalidade adicional referente ao período de aviso não cumprido.
                          </li>
                          <li>
                            O acesso ao sistema será mantido até o final do período de aviso prévio, quando será encerrado automaticamente.
                          </li>
                        </ul>
                      </div>

                      <div className="border-t border-gray-300 pt-3">
                        <p className="font-semibold text-gray-900 mb-2">Cancelamento por Inadimplência:</p>
                        <ul className="list-disc list-inside space-y-1 text-justify ml-4">
                          <li>
                            A prestadora de serviços poderá rescindir este contrato caso o cliente permaneça inadimplente por mais de 30 (trinta) dias corridos.
                          </li>
                          <li>
                            Neste caso, o cliente perderá o direito ao acesso ao sistema e aos dados armazenados, conforme política de retenção de dados.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Direitos e Responsabilidades */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      8. DIREITOS E RESPONSABILIDADES
                    </h2>
                    <div className="space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">
                          Da Prestadora de Serviços:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-justify ml-4">
                          <li>Fornecer acesso à plataforma conforme especificado no plano contratado</li>
                          <li>Manter suporte técnico disponível durante o horário comercial</li>
                          <li>Realizar atualizações e melhorias do sistema regularmente</li>
                          <li>Garantir segurança e confidencialidade dos dados do cliente</li>
                          <li>Manter a disponibilidade do sistema com uptime mínimo de 99%</li>
                        </ul>
                      </div>
                      <div className="border-t border-gray-300 pt-3">
                        <p className="font-semibold text-gray-900 mb-2">Do Cliente:</p>
                        <ul className="list-disc list-inside space-y-1 text-justify ml-4">
                          <li>Realizar pagamentos conforme acordado e nos prazos estabelecidos</li>
                          <li>Utilizar a plataforma de forma legal e ética</li>
                          <li>Não compartilhar credenciais com terceiros não autorizados</li>
                          <li>Notificar imediatamente sobre acessos não autorizados</li>
                          <li>Respeitar os termos de uso e políticas de segurança da plataforma</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Confidencialidade */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      9. CONFIDENCIALIDADE
                    </h2>
                    <p className="text-justify">
                      Ambas as partes se comprometem a manter confidencialidade sobre informações sensíveis e dados compartilhados durante o período
                      de vigência do contrato e após seu término, pelo prazo de 2 (dois) anos.
                    </p>
                  </div>

                  {/* Disposições Gerais */}
                  <div>
                    <h2 className="font-bold text-gray-900 mb-3">
                      10. DISPOSIÇÕES GERAIS
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-justify ml-2">
                      <li>
                        Este contrato constitui o acordo integral entre as partes e substitui todos os acordos anteriores relacionados ao mesmo objeto.
                      </li>
                      <li>
                        Qualquer alteração neste contrato deverá ser realizada por escrito e assinada por ambas as partes.
                      </li>
                      <li>
                        A invalidade de qualquer cláusula não afetará a validade das demais cláusulas deste contrato.
                      </li>
                      <li>
                        Este contrato é regido pelas leis da República Federativa do Brasil.
                      </li>
                    </ul>
                  </div>

                  {/* Assinaturas */}
                  <div className="border-t-2 border-gray-300 pt-8 mt-8">
                    <p className="text-center text-xs mb-12">
                      Assim acordam as partes, que assinam este contrato em duas vias de igual teor e forma.
                    </p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center">
                        <p className="border-t border-gray-400 pt-4 text-xs">
                          <strong>{EMPRESA.nome}</strong>
                          <br />
                          Assinatura
                          <br />
                          <span className="text-gray-600">_________________________</span>
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="border-t border-gray-400 pt-4 text-xs">
                          <strong>{formData.nomeCliente}</strong>
                          <br />
                          {formData.cargoResponsavel}
                          <br />
                          <span className="text-gray-600">_________________________</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
