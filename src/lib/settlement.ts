type Settlement = {status:string;date:string;paidDate?:string|null};

/** New settlements follow the actual payment day; legacy paid entries retain their known date. */
export function settlementDate(status:string,entered:string,today:string,original?:Settlement|null):string|null {
 if(status!=='realizado')return null;
 if(entered)return entered;
 return original?.status==='realizado' ? original.paidDate||original.date : today;
}
