import {Contracts} from '@/sp/abc/Contracts';import {NgoGate} from '@/sp/ngo/Gate';
export const dynamic='force-dynamic';export const metadata={title:'Contracts, StrayPaw',robots:{index:false,follow:false}};
export default function Page(){return<NgoGate title="Contracts" lede="Source terms and procedure reconciliation."><Contracts/></NgoGate>}
