import {WorkflowPolicies} from '@/sp/ngo/WorkflowPolicies';import {NgoGate} from '@/sp/ngo/Gate';
export const metadata={title:'Workflow policies, StrayPaw',robots:{index:false,follow:false}};
export default function Page(){return<NgoGate title="Workflow policies" lede="Source-backed operating requirements."><WorkflowPolicies/></NgoGate>}
