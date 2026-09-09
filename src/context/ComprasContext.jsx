import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const ComprasContext = createContext();

export function ComprasProvider({ children }) {
  const { tenantId } = useTenant();
  const { authUser, tenantLink } = useAuth();

  const [entidadesPermitidas, setEntidadesPermitidas] = useState([]);
  const [entidadeAtiva, setEntidadeAtivaState] = useState(null);
  
  const [podeTrocarEntidade, setPodeTrocarEntidade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const isCompras = location.pathname.startsWith('/compras');

  useEffect(() => {
    async function loadEntidades() {
      if (!tenantId || !authUser) {
		  setEntidadesPermitidas([]);
		  setEntidadeAtivaState(null);
		  setPodeTrocarEntidade(false);
		  setError(null);
		  setLoading(true);
		  return;
		}

      if (tenantLink && tenantLink.tenant_id !== tenantId) {
        setError('Divergência de tenant detectada. Acesso bloqueado.');
        setEntidadesPermitidas([]);
        setEntidadeAtivaState(null);
        setPodeTrocarEntidade(false);
        setLoading(false);
        return;
      }

      if (!isCompras) {
        setLoading(false);
        return;
      }

      // Se já temos as entidades em memória (e não mudou auth/tenant), aproveita o estado
      if (entidadesPermitidas.length > 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Buscar as entidades gestoras permitidas
        const { data, error: fetchError } = await supabase
          .from('compras_entidades_gestoras')
          .select('id, tenant_id, codigo, nome, is_active')
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        if (fetchError) throw fetchError;

        const entidades = data || [];
        setEntidadesPermitidas(entidades);

        if (entidades.length === 0) {
          setEntidadeAtivaState(null);
          setPodeTrocarEntidade(false);
        } else if (entidades.length === 1) {
          setEntidadeAtivaState(entidades[0]);
          setPodeTrocarEntidade(false);
        } else {
          setPodeTrocarEntidade(true);
          
          const sessionKey = `compras_entidade_ativa:${tenantId}:${authUser.id}`;
          const savedId = sessionStorage.getItem(sessionKey);
          const savedEntidade = savedId ? entidades.find(e => e.id === savedId) : null;

          if (savedEntidade) {
            setEntidadeAtivaState(savedEntidade);
          } else {
            const admEntidade = entidades.find(
              e => e.codigo?.toUpperCase() === 'ADMINISTRACAO' || 
                   e.codigo?.toUpperCase() === 'ADM' ||
                   e.nome?.toUpperCase() === 'ADMINISTRACAO' ||
                   e.nome?.toUpperCase().includes('ADMINISTRA')
            );
            
            if (admEntidade) {
              setEntidadeAtivaState(admEntidade);
            } else {
              setEntidadeAtivaState(entidades[0]);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar entidades gestoras:', err);
        setError(err.message);
        setEntidadesPermitidas([]);
        setEntidadeAtivaState(null);
        setPodeTrocarEntidade(false);
      } finally {
        setLoading(false);
      }
    }

    loadEntidades();
  }, [tenantId, authUser, tenantLink, isCompras, entidadesPermitidas.length]);

  const setEntidadeAtiva = (entidade) => {
    // Pode ser um ID ou o próprio objeto, mas validamos contra entidadesPermitidas
    const idToFind = typeof entidade === 'string' ? entidade : entidade?.id;
    
    const validEntidade = entidadesPermitidas.find(e => e.id === idToFind);
    if (validEntidade) {
      setEntidadeAtivaState(validEntidade);
      if (tenantId && authUser?.id) {
        const sessionKey = `compras_entidade_ativa:${tenantId}:${authUser.id}`;
        sessionStorage.setItem(sessionKey, validEntidade.id);
      }
    } else {
      console.warn('Tentativa de definir entidade inválida ou não autorizada para o usuário.');
    }
  };

  const entidadeAtivaId = entidadeAtiva?.id || null;
  

  const value = {
    entidadesPermitidas,
    entidadeAtiva,
    entidadeAtivaId,
    podeTrocarEntidade,
    loading,
    error,
    setEntidadeAtiva
  };

  return (
    <ComprasContext.Provider value={value}>
      {children}
    </ComprasContext.Provider>
  );
}

export function useCompras() {
  const context = useContext(ComprasContext);
  if (!context) {
    throw new Error('useCompras deve ser usado dentro de um ComprasProvider');
  }
  return context;
}
