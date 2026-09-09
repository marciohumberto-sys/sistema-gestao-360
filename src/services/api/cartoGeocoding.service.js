export async function geocodeActionAddressProgressive(data) {
    const rawBaseUrl = import.meta.env.VITE_CARTO_LDS_API_BASE_URL;
    const token = import.meta.env.VITE_CARTO_LDS_API_ACCESS_TOKEN;
    
    const baseUrlConfigured = !!rawBaseUrl;
    const tokenConfigured = !!token;
    const tokenLength = token ? token.length : 0;
    
    // Assegura baseUrl limpo
    let baseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';
    
    console.log(`[CARTO] baseUrl configurada: ${baseUrlConfigured}`);
    console.log(`[CARTO] token configurado: ${tokenConfigured} (tamanho: ${tokenLength})`);
    
    if (!baseUrl || !token) {
        throw new Error('CARTO_LDS_API_BASE_URL ou TOKEN não configurados.');
    }

    const endpointStr = `${baseUrl}/v3/lds/geocoding/geocode`;
    console.log(`[CARTO] endpoint final (sem token): ${endpointStr}`);

    const title = (data.nome || data.title || '').trim();
    console.log(`[CARTO] Processando ação: "${title}"`);

    const street = (data.address_street || '').trim();
    const numRaw = (data.address_number || '').trim();
    const district = (data.address_district || data.neighborhood || '').trim();
    const reference = (data.address_reference || data.referencia || data.reference || '').trim();
    const city = (data.address_city || 'Bezerros').trim();
    const state = (data.address_state || 'PE').trim();

    const ignoredNumbers = ['s/n', 'S/N', '-', 'sem número', 'sem numero'];
    const num = (!numRaw || ignoredNumbers.includes(numRaw.toLowerCase())) ? '' : numRaw;

    // Conforme instrução, testar endereço simples e dps completo.
    // O array attempts conterá os endereços construídos.
    const attempts = [];
    
    // 1. Simples (Gameleira, Bezerros, PE, Brasil) se tiver bairro
    if (district) {
        attempts.push([district, city, state, 'Brasil'].filter(Boolean).join(', '));
    }
    
    // 2. Rua + Número + Bairro...
    if (street) {
        const parts = [
            num ? `${street}, ${num}` : street,
            district,
            city,
            state,
            'Brasil'
        ].filter(Boolean);
        attempts.push(parts.join(', '));
    }

    // 3. Rua + Bairro...
    if (street) {
        attempts.push([street, district, city, state, 'Brasil'].filter(Boolean).join(', '));
    }

    // 4. Fallbacks adicionais
    if (reference) {
        attempts.push([reference, district, city, state, 'Brasil'].filter(Boolean).join(', '));
    }
    if (title) {
        attempts.push([title, district, city, state, 'Brasil'].filter(Boolean).join(', '));
    }
    
    const uniqueAttempts = Array.from(new Set(attempts));

    for (const attemptQuery of uniqueAttempts) {
        console.log(`[CARTO] Tentando endereço: "${attemptQuery}"`);
        try {
            const url = new URL(endpointStr);
            url.searchParams.append('address', attemptQuery);
            
            console.log(`[CARTO] URL final chamada: ${url.toString()}`);
            
            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log(`[CARTO] response.status: ${response.status}`);
            console.log(`[CARTO] response.statusText: ${response.statusText}`);

            const textRes = await response.text();
            console.log(`[CARTO] Corpo bruto da resposta (lim. 500 chars): ${textRes.substring(0, 500)}`);

            if (response.ok) {
                let dataRes;
                try {
                    dataRes = JSON.parse(textRes);
                } catch (e) {
                    console.log(`[CARTO] Falha no parse JSON da resposta.`);
                    continue;
                }
                
                let foundLat = null;
                let foundLng = null;
                
                // Formato CARTO LDS Array: [{"error":null,"value":[{"latitude":...,"longitude":...}]}]
                if (Array.isArray(dataRes) && dataRes.length > 0 && dataRes[0].value && dataRes[0].value.length > 0) {
                    foundLat = dataRes[0].value[0].latitude;
                    foundLng = dataRes[0].value[0].longitude;
                } else if (dataRes && dataRes.features && dataRes.features.length > 0) {
                    const coords = dataRes.features[0].geometry?.coordinates;
                    if (coords && coords.length >= 2) {
                        foundLng = coords[0];
                        foundLat = coords[1];
                    }
                } else if (dataRes && dataRes.geometry?.coordinates) {
                    foundLng = dataRes.geometry.coordinates[0];
                    foundLat = dataRes.geometry.coordinates[1];
                } else if (dataRes && typeof dataRes.lat !== 'undefined' && typeof dataRes.lng !== 'undefined') {
                    foundLat = dataRes.lat;
                    foundLng = dataRes.lng;
                } else if (dataRes && typeof dataRes.latitude !== 'undefined' && typeof dataRes.longitude !== 'undefined') {
                    foundLat = dataRes.latitude;
                    foundLng = dataRes.longitude;
                } else if (dataRes && typeof dataRes.location?.lat !== 'undefined') {
                    foundLat = dataRes.location.lat;
                    foundLng = dataRes.location.lng;
                } else if (typeof dataRes === 'string' && dataRes.startsWith('POINT')) {
                    // Tratar formato textual caso retorne WKT POINT(lng lat)
                    const match = dataRes.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/i);
                    if (match) {
                        foundLng = parseFloat(match[1]);
                        foundLat = parseFloat(match[2]);
                    }
                }
                
                // Só considerar sucesso se for numérico
                if (foundLat !== null && foundLng !== null && !isNaN(foundLat) && !isNaN(foundLng)) {
                    console.log(`[CARTO] Coordenadas numéricas válidas: LAT ${foundLat}, LNG ${foundLng}`);
                    return { lat: Number(foundLat), lng: Number(foundLng) };
                } else {
                    console.log(`[CARTO] Endereço não localizado nesta tentativa.`);
                }
            } else {
                // Classificar corretamente o erro HTTP
                if (response.status === 401 || response.status === 403) {
                    throw new Error(`Erro de Autenticação/Token/Referer CARTO (${response.status})`);
                } else if (response.status === 400) {
                    throw new Error(`Erro de Parâmetro/Requisição inválida CARTO (${response.status}): ${textRes}`);
                } else if (response.status === 404) {
                    throw new Error(`Endpoint CARTO não encontrado (${response.status}) - verifique a URL.`);
                } else if (response.status === 429) {
                    throw new Error(`Limite/Quota CARTO excedida (${response.status})`);
                } else {
                    throw new Error(`Erro CARTO genérico: ${response.status}`);
                }
            }
        } catch (err) {
            console.log(`[CARTO] Erro capturado na tentativa: ${err.message}`);
            // Se foi um throw explícito nosso (erro de api real, não "nao localizado"), jogamos para a tela.
            if (err.message.includes('CARTO')) {
                throw err;
            }
        }
    }

    return null;
}

