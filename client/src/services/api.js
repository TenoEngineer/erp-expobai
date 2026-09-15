import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

export const getCategorias = async () => {
  const { data } = await api.get('/categorias');
  return data;
};

export const getCategoriasAdmin = async () => {
  const { data } = await api.get('/categorias/admin');
  return data;
};

export const saveCategoria = async (categoria) => {
  if (categoria.id) {
    const { data } = await api.put(`/categorias/${categoria.id}`, categoria);
    return data;
  }
  const { data } = await api.post('/categorias', categoria);
  return data;
};

export const deleteCategoria = async (id) => {
  const { data } = await api.delete(`/categorias/${id}`);
  return data;
};

export const getProdutos = async (categoriaId = null) => {
  const url = categoriaId ? `/produtos?categoria_id=${categoriaId}` : '/produtos';
  const { data } = await api.get(url);
  return data;
};

export const getProdutosAdmin = async () => {
  const { data } = await api.get('/produtos/admin');
  return data;
};

export const saveProduto = async (produto) => {
  if (produto.id) {
    const { data } = await api.put(`/produtos/${produto.id}`, produto);
    return data;
  }
  const { data } = await api.post('/produtos', produto);
  return data;
};

export const updatePrecoProduto = async (id, preco) => {
  const { data } = await api.patch(`/produtos/${id}/preco`, { preco });
  return data;
};

export const toggleAtivoProduto = async (id) => {
  const { data } = await api.patch(`/produtos/${id}/toggle-ativo`);
  return data;
};

export const deleteProduto = async (id) => {
  const { data } = await api.delete(`/produtos/${id}`);
  return data;
};

export const uploadFotoProduto = async (file) => {
  const formData = new FormData();
  formData.append('foto', file);
  const { data } = await api.post('/produtos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const createPedido = async (pedidoData) => {
  const { data } = await api.post('/pedidos', pedidoData);
  return data;
};

export const getPedidos = async (limit = 50) => {
  const { data } = await api.get(`/pedidos?limit=${limit}`);
  return data;
};

export const cancelPedido = async (id) => {
  const { data } = await api.patch(`/pedidos/${id}/cancelar`);
  return data;
};

export const getFechamento = async () => {
  const { data } = await api.get('/relatorios/fechamento');
  return data;
};

export const getConfig = async () => {
  const { data } = await api.get('/configuracoes');
  return data;
};

export const saveConfig = async (config) => {
  const { data } = await api.post('/configuracoes', config);
  return data;
};

export default api;
