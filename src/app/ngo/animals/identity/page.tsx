import {IdentityReview} from '@/sp/ngo/IdentityReview';import {NgoGate} from '@/sp/ngo/Gate';
export const metadata={title:'Identity review, StrayPaw',robots:{index:false,follow:false}};
export default function Page(){return<NgoGate title="Identity review" lede="Provisional identification and duplicate review."><IdentityReview/></NgoGate>}
