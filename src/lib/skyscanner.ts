/**
 * Generates a Skyscanner Affiliate deep link.
 * 
 * Target URL Format:
 * https://www.skyscanner.net/transport/flights/{origin}/{destination}/{outboundDate}/{inboundDate}/
 * ?associateid={AFFILIATE_ID}&utm_source={AFFILIATE_ID}&utm_medium=affiliate
 */
export function generateSkyscannerLink(
    origin: string,
    destination: string,
    outboundDate: string, // YYYY-MM-DD
    inboundDate: string,  // YYYY-MM-DD
    affiliateId: string = process.env.SKYSCANNER_AFFILIATE_ID || 'TRANSIT'
): string {
    // Extract YYMMDD for the path (Skyscanner often uses this shorthand in paths, but full date works in query)
    // Let's use the standard readable path format: /origin/dest/YYMMDD/YYMMDD

    const formatDate = (date: string) => date.slice(2).replace(/-/g, ''); // 2024-05-01 -> 240501

    const outStr = formatDate(outboundDate);
    const inStr = formatDate(inboundDate);

    const baseUrl = `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${outStr}/${inStr}/`;

    const params = new URLSearchParams({
        adults: '1',
        adultsv2: '1',
        cabinclass: 'economy',
        children: '0',
        childrenv2: '0',
        inboundaltsenabled: 'false',
        infants: '0',
        outboundaltsenabled: 'false',
        preferdirects: 'false',
        ref: 'home',
        rtn: '1',
        associateid: affiliateId,
        utm_source: affiliateId,
        utm_medium: 'affiliate',
        utm_campaign: 'cheapflights_bot'
    });

    return `${baseUrl}?${params.toString()}`;
}
