import { describe, it, expect } from 'vitest';
import { classeDoAtivo, resumoCarteira, Ativo, Categoria } from '../../lib/portfolio';
import { regraDaCategoria } from '../../lib/tributacao';

describe('Nomenclatura Fundos Imobiliários -> FIIS', () => {
  const mockAtivo = (categoria: Categoria): Ativo => ({
    id: '1',
    ticker: 'HGLG11',
    nome: 'CSHG Logística',
    categoria,
    quantidade: 100,
    precoMedio: 150,
    precoAtual: 160,
    dy: 8,
  });

  it('deve mapear a nova categoria FIIS para a classe de ativos correta', () => {
    const ativoNovo = mockAtivo('FIIS');
    const ativoLegado = mockAtivo('FIIs');
    
    expect(classeDoAtivo(ativoNovo)).toBe('FIIS');
    expect(classeDoAtivo(ativoLegado)).toBe('FIIS');
  });

  it('deve aplicar a regra tributária correta para FIIS', () => {
    expect(regraDaCategoria('FIIS')).toBe('fii');
    expect(regraDaCategoria('FIIs')).toBe('fii');
  });

  it('deve calcular corretamente o resumo da carteira com a nova categoria', () => {
    const ativos: Ativo[] = [mockAtivo('FIIS')];
    const resumo = resumoCarteira(ativos);
    
    // 100 * 160 = 16000
    expect(resumo.totalAtual).toBe(16000);
    // 100 * 150 = 15000
    expect(resumo.totalInvestido).toBe(15000);
    expect(resumo.lucroTotal).toBe(1000);
    // (16000 * 8) / 100 = 1280
    expect(resumo.dividendosEstimados12m).toBe(1280);
  });
});
