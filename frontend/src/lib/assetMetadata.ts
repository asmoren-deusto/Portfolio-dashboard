/**
 * Asset metadata registry - Official names, clean display names, currency, and share class (ACC / DIST / ETC).
 */

export interface AssetMetaInfo {
  cleanName: string         // Short clean name requested by user
  officialName: string      // Full official prospectus name
  currency: string          // 'EUR' | 'USD' | etc.
  shareClass: 'ACC' | 'DIST' | 'ETC' | 'CASH' | 'BONO'
  shareClassLabel: string   // 'Acumulación' | 'Distribución' | etc.
}

export const ASSET_METADATA_BY_ISIN: Record<string, AssetMetaInfo> = {
  // 1. Vanguard U.S. 500
  'IE0032126645': {
    cleanName: 'Vanguard U.S. SP500 Index',
    officialName: 'Vanguard U.S. 500 Stock Index Fund EUR Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación (Reinversión de dividendos)',
  },
  // 2. DNB Fund Technology
  'LU0302296495': {
    cleanName: 'DNB Fund Technology',
    officialName: 'DNB Fund - Technology retail A (EUR)',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  // 3. Azvalor Internacional FI
  'ES0112611001': {
    cleanName: 'Azvalor Internacional FI',
    officialName: 'Azvalor Internacional FI',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  // 4. MSCI Japan Index (Hedged)
  'IE00BYX5NH74': {
    cleanName: 'MSCI Japan Index (Hedged)',
    officialName: 'Fidelity MSCI Japan Index Fund EUR Hedged Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación (Divisa Cubierta EUR)',
  },
  // 5. Euro 50 Index Fund
  'LU0261952682': {
    cleanName: 'Euro 50 Index Fund',
    officialName: 'Fidelity Euro 50 Index Fund A-ACC-EUR',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  // 6. Emerging Markets Index
  'IE000QAZP7L2': {
    cleanName: 'Emerging Markets Index',
    officialName: 'iShares Emerging Markets Index (IE) S Acc EUR',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  // 7. BGF World Healthscience
  'LU0171307068': {
    cleanName: 'BGF World Healthscience',
    officialName: 'BlackRock Global Funds - World Healthscience Fund A2 (EUR)',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  // 8. Indexa Más Rentabilidad Acciones
  '0192#0011': {
    cleanName: 'Indexa Más Rentabilidad Acciones',
    officialName: 'Indexa Más Rentabilidad Acciones EPSV',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Plan de Previsión / Acumulación',
  },
  // 9. Bonos Gobierno España Jul 32
  'ES0000012411': {
    cleanName: 'Bonos Gobierno España Jul 32',
    officialName: 'Bonos del Estado Español 5,75% Vto. 30/07/2032',
    currency: 'EUR',
    shareClass: 'DIST',
    shareClassLabel: 'Distribución (Cupón Anual 5,75%)',
  },
    // 11. Groupama Trésorerie IC
  'FR0000989626': {
    cleanName: 'Groupama Trésorerie IC',
    officialName: 'Groupama Trésorerie IC',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Fondo Monetario EUR (Acumulación)',
  },
  // 10. iShares Physical Gold ETC
  'IE00B4ND3602': {
    cleanName: 'iShares Physical Gold ETC',
    officialName: 'iShares Physical Gold ETC (Xetra PPFB.DE)',
    currency: 'EUR',
    shareClass: 'ETC',
    shareClassLabel: 'ETC Físico (Respaldo en Lingotes de Oro)',
  },

  // Historical & Traded Assets
  'IE000ZYRH0Q7': {
    cleanName: 'iShares Developed World Index',
    officialName: 'iShares Developed World Index (IE) S Acc EUR',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'IE00BYX5NX33': {
    cleanName: 'MSCI World Index Fund',
    officialName: 'Fidelity MSCI World Index Fund EUR P Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'IE00BYX5M476': {
    cleanName: 'MSCI Emerging Markets Index',
    officialName: 'Fidelity MSCI Emerging Markets Index Fund EUR P Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'LU1598719752': {
    cleanName: 'Cobas International Fund',
    officialName: 'Cobas Lux SICAV - Cobas International Fund P EUR Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'LU0996182563': {
    cleanName: 'Amundi Index MSCI World',
    officialName: 'Amundi Index Solutions - Amundi Index MSCI World AE-C',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'LU1623762843': {
    cleanName: 'Carmignac Portfolio Credit',
    officialName: 'Carmignac Portfolio Credit A EUR Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'LU2145461757': {
    cleanName: 'Robeco Smart Energy',
    officialName: 'Robeco Capital Growth - Robeco Smart Energy D EUR',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'IE00BM95B621': {
    cleanName: 'Polar Capital Global Technology',
    officialName: 'Polar Capital Global Technology Fund R Acc',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  '0201G': {
    cleanName: 'Kutxabank Baskepensiones',
    officialName: 'Kutxabank Baskepensiones EPSV',
    currency: 'EUR',
    shareClass: 'ACC',
    shareClassLabel: 'Acumulación',
  },
  'TR_TRANSFER': {
    cleanName: 'Cartera Trade Republic',
    officialName: 'Cuenta Efectivo y Valores Trade Republic',
    currency: 'EUR',
    shareClass: 'CASH',
    shareClassLabel: 'Cuenta Corriente Remunerada',
  },
}

/**
 * Resolves the clean display name for an asset given its ISIN and/or current name.
 */
export function getAssetCleanName(isin?: string | null, rawName?: string | null): string {
  if (isin && ASSET_METADATA_BY_ISIN[isin]) {
    return ASSET_METADATA_BY_ISIN[isin].cleanName
  }

  if (!rawName) return isin || ''

  // Fallback pattern matching by name
  const nLower = rawName.toLowerCase()
  if (nLower.includes('vanguard') && (nLower.includes('500') || nLower.includes('sp500') || nLower.includes('s&p'))) {
    return 'Vanguard U.S. SP500 Index'
  }
  if (nLower.includes('dnb') && (nLower.includes('tech') || nLower.includes('tecnología'))) {
    return 'DNB Fund Technology'
  }
  if (nLower.includes('azvalor')) {
    return 'Azvalor Internacional FI'
  }
  if (nLower.includes('msci japan') || (nLower.includes('japan') && nLower.includes('fidelity'))) {
    return 'MSCI Japan Index (Hedged)'
  }
  if (nLower.includes('euro 50') || nLower.includes('stoxx 50') || nLower.includes('euro50')) {
    return 'Euro 50 Index Fund'
  }
  if (nLower.includes('emerging') && (nLower.includes('ishares') || nLower.includes('fidelity') || nLower.includes('index'))) {
    return 'Emerging Markets Index'
  }
  if (nLower.includes('healthscience') || nLower.includes('health science') || nLower.includes('world health')) {
    return 'BGF World Healthscience'
  }
  if (nLower.includes('indexa') && (nLower.includes('acciones') || nLower.includes('rentabilidad'))) {
    return 'Indexa Más Rentabilidad Acciones'
  }
  if (nLower.includes('bonos') && (nLower.includes('gob') || nLower.includes('españa') || nLower.includes('2032') || nLower.includes('jul 32'))) {
    return 'Bonos Gobierno España Jul 32'
  }
  if (nLower.includes('gold') || nLower.includes('oro') || nLower.includes('physical gold')) {
    return 'iShares Physical Gold ETC'
  }

  return rawName
}

/**
 * Returns full official details (official name, currency, share class) for modal display.
 */
export function getAssetOfficialDetails(
  isin?: string | null,
  rawName?: string | null,
  fallbackCurrency?: string | null
): AssetMetaInfo {
  if (isin && ASSET_METADATA_BY_ISIN[isin]) {
    return ASSET_METADATA_BY_ISIN[isin]
  }

  const clean = getAssetCleanName(isin, rawName)
  const currency = fallbackCurrency || 'EUR'

  const nLower = (rawName || clean).toLowerCase()
  let shareClass: AssetMetaInfo['shareClass'] = 'ACC'
  let shareClassLabel = 'Acumulación'

  if (nLower.includes('dist') || nLower.includes('reparto') || nLower.includes('bono') || isin === 'ES0000012411') {
    shareClass = 'DIST'
    shareClassLabel = 'Distribución'
  } else if (nLower.includes('etc') || nLower.includes('gold') || nLower.includes('oro') || isin === 'IE00B4ND3602') {
    shareClass = 'ETC'
    shareClassLabel = 'ETC Físico'
  }

  return {
    cleanName: clean,
    officialName: rawName || clean,
    currency,
    shareClass,
    shareClassLabel,
  }
}

