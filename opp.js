import { sb } from './supabase'
export const TYPES = { gig: 'Paid gig / service', booking: 'Booking request', collab: 'Collaboration', network: 'Networking', talent: 'Talent call', job: 'Job / opportunity' }
export const TSHORT = { gig: 'Gig', booking: 'Booking', collab: 'Collab', network: 'Network', talent: 'Talent call', job: 'Job' }
export const COMP = { paid: 'Paid', unpaid: 'Unpaid', negotiable: 'Negotiable', unspecified: 'Pay not specified' }
export const CATS = ['Music', 'Photo & video', 'Fashion', 'Food', 'Events', 'Beauty', 'Business', 'Tech', 'Other']
export const CONTACT = { both: 'Message or "I\'m interested"', dm: 'Message only', interest: '"I\'m interested" only' }
export const REASONS = { spam: 'Spam', scam: 'Scam or fraud', misleading_pay: 'Misleading pay or details', discriminatory: 'Discriminatory', harassment: 'Harassment', impersonation: 'Impersonation', other: 'Something else' }
export const oppSel = 'id,title,type,compensation,compensation_note,category,description,requirements,location,is_remote,deadline,status,contact_method,image_path,created_at,poster:profiles!opportunities_poster_id_fkey(id,username,display_name,avatar_url,is_verified)'
export const oppImg = p => p ? sb.storage.from('opportunity-media').getPublicUrl(p).data.publicUrl : null
export const dlabel = d => d ? new Date(d + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }) : null
import { friendly } from './supabase'
export const errMsg = e => /rate_limit: (opp|listing)/.test(e?.message || '') ? "You've hit today's limit for that. Try again tomorrow." : (friendly(e) || 'Something went wrong.')
