import os
import sys
import time
import math
import random
import json
from urlparse import parse_qs
import datetime

HERE = os.path.split(os.path.abspath(__file__))[0]     # looks awful, but gets the parent dir
PARENT = os.path.split(HERE)[0]
sys.path.append(PARENT+"/deps")

MODULE_CACHE_DIR = '/tmp/rocstar/mako_modules'      # change "my_app_name" to your application name

import web

from templating import Configure

Configure(
    [os.path.join(PARENT, 'templates')], 
    module_cache_dir = MODULE_CACHE_DIR
)

from rocstar_handlers import *

SESSION_DIR = '/tmp/rocstar'            # change "my_app_name" to your application name
URLS = (
    '/rxr','rocstar_handlers.rxr_noise',
    '/plot_all','rocstar_handlers.plot_all',
    '/vols','rocstar_handlers.volumes',
    '/days','rocstar_handlers.days',
    '/blank','rocstar_handlers.blank_request',
    '/builds','rocstar_handlers.builds',
    '/(js|css|images)/(.*)','static'      
)

app = web.application(URLS, globals())
application = app.wsgifunc()
if __name__ == '__main__':
    app.run()

