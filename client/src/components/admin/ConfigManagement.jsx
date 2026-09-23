import React, { useState, useEffect } from 'react';
import { Save, Check, Printer, RefreshCw, AlertCircle, Wifi, Usb, Monitor, Scissors, Tablet, Smartphone } from 'lucide-react';
import { saveConfig, getPrinters, testPrinter } from '../../services/api';
import { isWebUsbSupported, requestWebUsbPrinter, printDirectWebUsb, printViaRawBT, getTicketBuffer } from '../../services/tabletPrinter';

export default function ConfigManagement({ config = {}, onRefresh }) {
  const [formData, setFormData] = useState({
    nome_estande: '',
    chave_pix: '',
    prefixo_pedido: 'EXP',
    impressora_tipo: 'usb', // 'usb', 'rede', 'navegador', 'desativado'
    impressora_ip: '192.168.1.200',
    impressora_porta: '9100',
    impressora_nome_usb: '',
    impressora_auto_imprimir: 'true',
    impressora_vias: 'ambas',
    impressora_largura: '80mm',
    impressora_cortar_papel: 'true'
  });

  const [printersList, setPrintersList] = useState([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  const [platform, setPlatform] = useState('unknown');

  // Carregar configurações existentes
  useEffect(() => {
    if (config) {
      setFormData({
        nome_estande: config.nome_estande || 'Tenda dos Müller',
        chave_pix: config.chave_pix || 'pix@expobai.com.br',
        prefixo_pedido: config.prefixo_pedido || 'EXP',
        impressora_tipo: config.impressora_tipo || 'usb',
        impressora_ip: config.impressora_ip || '192.168.1.200',
        impressora_porta: config.impressora_porta || '9100',
        impressora_nome_usb: config.impressora_nome_usb || '',
        impressora_auto_imprimir: config.impressora_auto_imprimir !== 'false' ? 'true' : 'false',
        impressora_vias: config.impressora_vias || 'ambas',
        impressora_largura: config.impressora_largura || '80mm',
        impressora_cortar_papel: config.impressora_cortar_papel !== 'false' ? 'true' : 'false'
      });
    }
  }, [config]);

  // Carregar lista de impressoras (Linux ou Windows)
  const loadPrinters = async () => {
    try {
      setLoadingPrinters(true);
      const res = await getPrinters();
      const list = Array.isArray(res) ? res : (res.printers || []);
      const plat = res.platform || 'unknown';
      setPlatform(plat);
      setPrintersList(list);

      // Se não tiver selecionado nenhuma ainda, seleciona a primeira ou a que parecer térmica
      if (list.length > 0 && !formData.impressora_nome_usb) {
        const thermal = list.find(p => /pos|thermal|elgin|epson|bema|daruma|receipt|lp0/i.test(p));
        setFormData(prev => ({
          ...prev,
          impressora_nome_usb: thermal || list[0]
        }));
      }
    } catch (err) {
      console.warn('Erro ao carregar impressoras do sistema:', err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveConfig(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onRefresh();
    } catch (err) {
      alert('Erro ao salvar configurações: ' + err.message);
    }
  };

  const [usbConnectedName, setUsbConnectedName] = useState('');

  const handlePairWebUsb = async () => {
    try {
      const dev = await requestWebUsbPrinter();
      const name = dev.productName || 'Impressora Bematech/Elgin USB';
      setUsbConnectedName(name);
      setTestResult({
        success: true,
        message: `Impressora "${name}" conectada com sucesso ao Tablet via cabo USB!`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `Erro ao parear USB no Tablet: ${err.message}`
      });
    }
  };

  const handleTestPrinter = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (formData.impressora_tipo === 'tablet_usb') {
        const base64 = await getTicketBuffer(null, true);
        const res = await printDirectWebUsb(base64);
        setTestResult({
          success: true,
          message: res.message || 'Ticket de teste impresso com sucesso via cabo USB no Tablet!'
        });
      } else if (formData.impressora_tipo === 'rawbt') {
        const base64 = await getTicketBuffer(null, true);
        printViaRawBT(base64);
        setTestResult({
          success: true,
          message: 'Enviado para o RawBT no Tablet!'
        });
      } else {
        const res = await testPrinter(formData);
        setTestResult({
          success: true,
          message: res.message || 'Comando enviado! Verifique o papel na impressora.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.error || err.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      
      <div>
        <h3 className="font-bold text-xl text-slate-100 flex items-center gap-2">
          <span>⚙️</span> Configurações do Sistema & Impressão
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure a identificação da sua barraca na Expobai e a automação dos tickets térmicos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. SEÇÃO DA IMPRESSORA TÉRMICA (DESTAQUE PRINCIPAL) */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 p-5 sm:p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white flex items-center gap-2">
                  Automação de Impressão de Comandas
                </h4>
                <p className="text-xs text-emerald-400 font-medium">
                  Impressão automática imediata ao finalizar pedido (sem clique)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestPrinter}
              disabled={testing || formData.impressora_tipo === 'desativado'}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-amber-500/30 flex items-center gap-2 transition-all shrink-0"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Printer className="w-4 h-4 text-amber-400" />
              )}
              <span>{testing ? 'Enviando...' : 'Testar Impressora Agora'}</span>
            </button>
          </div>

          {/* Feedback do Teste */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500 text-rose-200'
            }`}>
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Seleção do Tipo de Conexão */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Conexão com a Impressora
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Opção Tablet USB Direto (Cabo OTG) */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'tablet_usb'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="tablet_usb"
                    checked={formData.impressora_tipo === 'tablet_usb'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-emerald-500"
                  />
                  <Tablet className="w-4 h-4 text-emerald-400" />
                  <span>📱 Tablet USB (Cabo OTG)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Impressora ligada direto no cabo do Tablet via USB-C / OTG (WebUSB no Chrome)
                </span>
              </label>

              {/* Opção RawBT (App Android) */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'rawbt'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="rawbt"
                    checked={formData.impressora_tipo === 'rawbt'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-emerald-500"
                  />
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>📲 Tablet RawBT (App)</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Usa o aplicativo RawBT no Tablet Android para imprimir direto na USB
                </span>
              </label>

              {/* Opção USB PC (Linux / Windows) */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'usb'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="usb"
                    checked={formData.impressora_tipo === 'usb'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-emerald-500"
                  />
                  <Usb className="w-4 h-4 text-emerald-400" />
                  <span>💻 Computador USB</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Impressora USB conectada no computador Linux (/dev/usb/lp0) ou Windows
                </span>
              </label>

              {/* Opção Rede */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'rede'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="rede"
                    checked={formData.impressora_tipo === 'rede'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-emerald-500"
                  />
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>🌐 Rede / Wi-Fi</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Impressora com cabo de rede Ethernet ou Wi-Fi (IP:9100)
                </span>
              </label>

              {/* Opção Navegador */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'navegador'
                  ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="navegador"
                    checked={formData.impressora_tipo === 'navegador'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-emerald-500"
                  />
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>🖨️ Navegador</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Auto-print do navegador / diálogo de impressão
                </span>
              </label>

              {/* Opção Desativado */}
              <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                formData.impressora_tipo === 'desativado'
                  ? 'bg-slate-800 border-slate-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:bg-slate-800/60'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm mb-1">
                  <input
                    type="radio"
                    name="impressora_tipo"
                    value="desativado"
                    checked={formData.impressora_tipo === 'desativado'}
                    onChange={(e) => setFormData({ ...formData, impressora_tipo: e.target.value })}
                    className="accent-slate-500"
                  />
                  <span>🚫 Desativado</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Não imprimir tickets físicos
                </span>
              </label>

            </div>
          </div>

          {/* Configuração Específica de Tablet USB Direto (WebUSB) */}
          {formData.impressora_tipo === 'tablet_usb' && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-emerald-500/50 space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                    <Tablet className="w-4 h-4" />
                    <span>Conexão Direta Tablet ➔ Impressora via Cabo USB (WebUSB)</span>
                  </h5>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Conecte o cabo USB da Bematech / Elgin no Tablet usando um adaptador USB-C / OTG.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePairWebUsb}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 shrink-0 transition-all active:scale-[0.98]"
                >
                  <Usb className="w-4 h-4" />
                  <span>{usbConnectedName ? 'Reconectar Impressora USB' : 'Conectar Impressora USB no Tablet'}</span>
                </button>
              </div>

              {usbConnectedName && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Impressora conectada: <b>{usbConnectedName}</b></span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                💡 No Google Chrome do Tablet, ao clicar em "Conectar", selecione a Bematech ou Elgin na lista que aparecer. A partir daí, qualquer venda imprimirá os 2 tickets diretamente pelo cabo!
              </p>
            </div>
          )}

          {/* Configuração Específica de Tablet RawBT */}
          {formData.impressora_tipo === 'rawbt' && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
              <h5 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Impressão no Tablet Android via App RawBT</span>
              </h5>
              <div className="text-xs text-slate-300 space-y-1">
                <p>1. Instale o app gratuito <b>RawBT Print Service</b> da Google Play Store no seu Tablet Android.</p>
                <p>2. Conecte o cabo USB da Bematech / Elgin no Tablet com o adaptador OTG e selecione-a no RawBT.</p>
                <p>3. Pronto! Ao confirmar vendas no ERP pelo Tablet, os 2 tickets são enviados direto para o RawBT imprimir e cortar na hora.</p>
              </div>
            </div>
          )}

          {/* Configuração Específica de USB PC */}
          {formData.impressora_tipo === 'usb' && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    {platform === 'linux' ? 'Dispositivo USB / Fila CUPS (Linux)' : 'Impressora USB Selecionada (Windows / Linux)'}
                  </label>
                  {platform === 'linux' && (
                    <span className="text-[11px] text-emerald-400 font-medium block">
                      🐧 Linux detectado: Use a porta direta <b>/dev/usb/lp0</b> ou a fila CUPS
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={loadPrinters}
                  disabled={loadingPrinters}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPrinters ? 'animate-spin' : ''}`} />
                  <span>Atualizar Portas/Impressoras</span>
                </button>
              </div>

              {printersList.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={formData.impressora_nome_usb}
                    onChange={(e) => setFormData({ ...formData, impressora_nome_usb: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Selecione uma porta/impressora...</option>
                    {printersList.map((prn) => (
                      <option key={prn} value={prn}>
                        {prn === '/dev/usb/lp0' ? '🔌 /dev/usb/lp0 (Porta USB Padrão Linux)' : prn}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    {platform === 'linux'
                      ? 'Ao conectar a Bematech / Elgin via cabo USB no Linux, o sistema cria o dispositivo /dev/usb/lp0 automaticamente.'
                      : 'Detecta automaticamente impressoras térmicas conectadas.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={platform === 'linux' ? '/dev/usb/lp0 ou Nome_Impressora_CUPS' : 'Ex: POS-80 ou Epson TM-T20'}
                    value={formData.impressora_nome_usb}
                    onChange={(e) => setFormData({ ...formData, impressora_nome_usb: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    {platform === 'linux'
                      ? 'Digite /dev/usb/lp0 para comunicação USB direta ou o nome da impressora no CUPS.'
                      : 'Digite o nome exato da impressora instalada no Painel de Controle do Windows.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Configuração Específica de Rede */}
          {formData.impressora_tipo === 'rede' && (
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Endereço IP da Impressora
                </label>
                <input
                  type="text"
                  placeholder="Ex: 192.168.1.200"
                  required={formData.impressora_tipo === 'rede'}
                  value={formData.impressora_ip}
                  onChange={(e) => setFormData({ ...formData, impressora_ip: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  IP configurado na impressora de rede (Ethernet ou Wi-Fi).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Porta TCP
                </label>
                <input
                  type="text"
                  placeholder="9100"
                  value={formData.impressora_porta}
                  onChange={(e) => setFormData({ ...formData, impressora_porta: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Padrão RAW: 9100
                </p>
              </div>
            </div>
          )}

          {/* Opções de Impressão e Formato dos Tickets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Formato das Vias */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Emissão dos Tickets
              </label>
              <select
                value={formData.impressora_vias}
                onChange={(e) => setFormData({ ...formData, impressora_vias: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ambas">
                  🎟️ 2 Vias: Cliente (Só Número) + Cozinha (Número + Itens)
                </option>
                <option value="apenas_cliente">
                  🎟️ Apenas 1 Via: Cliente (Somente Número)
                </option>
                <option value="apenas_cozinha">
                  👨‍🍳 Apenas 1 Via: Cozinha / Preparo (Número + Itens)
                </option>
              </select>
            </div>

            {/* Largura da Bobina */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Largura da Bobina Térmica
              </label>
              <select
                value={formData.impressora_largura}
                onChange={(e) => setFormData({ ...formData, impressora_largura: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="80mm">80mm (Padrão de Caixas - 48 Colunas)</option>
                <option value="58mm">58mm (Bobina Estreita / Portátil - 32 Colunas)</option>
              </select>
            </div>

            {/* Checkboxes de Automação */}
            <div className="sm:col-span-2 space-y-2.5 pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.impressora_auto_imprimir === 'true'}
                  onChange={(e) => setFormData({
                    ...formData,
                    impressora_auto_imprimir: e.target.checked ? 'true' : 'false'
                  })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    ⚡ Impressão Instantânea Automática (Sem Clique)
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Assim que o operador clicar em "Confirmar Pagamento", os tickets saem imediatamente na impressora.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.impressora_cortar_papel === 'true'}
                  onChange={(e) => setFormData({
                    ...formData,
                    impressora_cortar_papel: e.target.checked ? 'true' : 'false'
                  })}
                  className="w-4 h-4 accent-emerald-500 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-amber-400" />
                    <span>Corte de Papel Automático (Guilhotina ESC/POS)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Envia o sinal para a guilhotina cortar entre o ticket do cliente e a comanda da cozinha.
                  </span>
                </div>
              </label>
            </div>

          </div>

        </div>

        {/* 2. SEÇÃO DADOS DO ESTANDE & PAGAMENTO PIX */}
        <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-xl space-y-4">
          <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
            Identificação da Barraca & PIX
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Nome do Estande / Barraca
              </label>
              <input
                type="text"
                required
                value={formData.nome_estande}
                onChange={(e) => setFormData({ ...formData, nome_estande: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Prefixo do Pedido
              </label>
              <input
                type="text"
                required
                value={formData.prefixo_pedido}
                onChange={(e) => setFormData({ ...formData, prefixo_pedido: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
              Chave PIX para Recebimentos
            </label>
            <input
              type="text"
              required
              placeholder="CNPJ, E-mail, Celular ou Chave Aleatória"
              value={formData.chave_pix}
              onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Esta chave é gerada em QR Code para pagamento instantâneo no checkout.
            </p>
          </div>
        </div>

        {/* Botão Salvar Geral */}
        <div className="pt-2 flex items-center justify-between">
          {saved ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-4 h-4" />
              Configurações salvas com sucesso!
            </span>
          ) : <div />}

          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Todas as Configurações</span>
          </button>
        </div>

      </form>
    </div>
  );
}
