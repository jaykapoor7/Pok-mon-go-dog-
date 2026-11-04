import {BrandLogo} from '@/components/site/BrandLogo';
import {cn} from '@/lib/utils';
type Size='sm'|'md'|'lg';
const SIZE={sm:120,md:156,lg:192};
export function AnimalMark({className}:{className?:string}){return<span className={cn('inline-flex items-center justify-center shrink-0',className)}><BrandLogo compact/></span>}
export function StrayPawBadge({className}:{className?:string}){return<span className={cn('inline-flex items-center justify-center shrink-0',className)}><BrandLogo/></span>}
export function Logo({className,size='md',showWordmark=true}:{className?:string;size?:Size;showWordmark?:boolean}){return<span className={cn('inline-flex items-center',className)} style={showWordmark?{width:SIZE[size]}:undefined}><BrandLogo compact={!showWordmark}/></span>}
