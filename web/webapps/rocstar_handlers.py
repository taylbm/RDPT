from platform import architecture
word_size = int(architecture()[0].replace('bit',''))
if word_size == 32:
    import simplejson as json
else:
    import json
from templating import LOOKUP
import sys
import os
import web
import math
import random

from radial import Radial

def has_numbers(inputString):
    """ checks for digits in string """
    return any(char.isdigit() for char in inputString)

spool_dir = '/import/level_2/levelII-spool/'
icao_list_full = os.listdir(spool_dir)
icao_list = [i for i in icao_list_full if i[0] in ["K","P","T","R"] and "ROP" not in i] 
KCRI_list = [i for i in icao_list_full if has_numbers(i)]
icao_list.sort()
icao_list.sort()

class details(object):
    def GET(self):
	data = web.input()
	if data:	
	    if data.ICAO in icao_list:
                return LOOKUP.detail(**{'ICAO':data.ICAO,'ICAO_list':icao_list,'KCRI_list':KCRI_list})
	    else:	
                return LOOKUP.detail(**{'ICAO':data.ICAO,'ICAO_list':icao_list,'KCRI_list':KCRI_list})
	else:
	    return LOOKUP.detail(**{'ICAO':'Please Select an ICAO','ICAO_list':icao_list,'KCRI_list':KCRI_list}) 

class rxr_noise(object):
    def GET(self):
        return LOOKUP.rxr(**{'ICAO_list':icao_list,'KCRI_list':KCRI_list}) 

class randomData(object):
    def GET(self):
        data = web.input()
        start = data.min
        stop = data.max
        start_int = int(start)
        stop_int = int(stop)
        diff = stop_int - start_int
        i = diff / 200000
        print i 
        lst = [{"x":x,"y":math.log(random.randint(1,1000))/random.randint(1,10000)} for x in xrange(start_int,stop_int,i)]
        return json.dumps(lst)  

class volumes(object):
    def GET(self):
	data = web.input()
	print data
	icao = data.ICAO
	day = data.date.split('/')
        if day == ['']:
            return json.dumps({"err":"Please select a valid date"})
        else:
	    month = icao + '.' + day[2] + '.' + day[0]
	    vols = os.listdir( os.path.join(spool_dir, icao, month, day[1]) )
	    disp_vols = [v[12:14]+':'+v[14:16]+':'+v[16:18]+'Z' for v in vols]
	    return json.dumps({"full_filenames":vols,"display_names":disp_vols})

class plot_all(object):
    def GET(self):
        data = web.input()
        print data
        icao = data.ICAO
        day = data.date.split('/')
        fname = data.fname
        month = icao + '.' + day[2] + '.' + day[0]
        r = Radial( os.path.join(spool_dir, icao, month, day[1], fname), 4)
        out = r.process_volume()
        if data.get('key'):
            return json.dumps(out.get(data.key))
        else:
            if not out["VCP"]:
                print type(out["err"][2])
                return json.dumps({"err":out["err"]})
            else: 
                return json.dumps(out)

class days(object):
    def GET(self):
        months = {}
        data = web.input()
        icao = data.ICAO
        month_list = os.listdir(os.path.join(spool_dir,icao))
        for month in month_list:
            months.update({month:os.listdir(os.path.join(spool_dir,icao,month))})
        return json.dumps(months)

class blank_request(object):
    def GET(self):
        data = web.input()
        print data
        return json.dumps(None)

class builds(object):
    def GET(self):
        icao_dict = {}
        for icao in icao_list_full:
            months = os.listdir(os.path.join(spool_dir,icao))
            if months:
                days = os.listdir(os.path.join(spool_dir,icao,months[-1]))
                files = os.listdir(os.path.join(spool_dir,icao,months[-1],days[-1]))
                r = Radial(os.path.join(spool_dir,icao,months[-1],days[-1],files[-1]),4)
                out = r.retrieve_build()
                icao_dict.update({icao:out['build']})
        return json.dumps(icao_dict)

class rocstar(object):
    def GET(self):
	raise web.seeother('static/index.html')


	

