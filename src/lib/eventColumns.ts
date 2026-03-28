// Shared column selection for events_with_details queries
// Using explicit columns instead of select('*') for better performance
export const EVENT_LIST_COLUMNS = 'id,title,description,category,date,time,location,city,state,price,max_participants,is_private,is_recurring,recurrence_type,recurrence_end_date,parent_event_id,image_url,created_by,created_at,updated_at,private_code,creator_name,creator_avatar,participants_count,average_rating,review_count' as const;
